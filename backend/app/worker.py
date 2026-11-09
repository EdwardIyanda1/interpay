"""In-process scheduler. Swap for Celery or ARQ in production."""
import asyncio
import logging
from datetime import timedelta

from .config import settings
from .db import SessionLocal
from .models import Event, LedgerEntry, Notification, Order, Payout, Refund
from .realtime import emit
from .runtime import R
from .services import core, mailer
from .services.payouts import get_payouts
from .util import utcnow

log = logging.getLogger("interpay.worker")


def expire_orders(db):
    for o in db.query(Order).filter(Order.status == "PENDING", Order.expires_at < utcnow()).all():
        o.status = "EXPIRED"


def lock_and_complete(db):
    now = utcnow()
    for e in db.query(Event).filter(Event.status == "PUBLISHED").all():
        if now >= core.cancel_deadline(e):
            e.status = "LOCKED"
            for (oid,) in db.query(Order.id).filter(Order.event_id == e.id, Order.status == "PAID"):
                emit(db, f"order:{oid}", "event.locked", {"event_id": e.id})
            emit(db, f"event:{e.id}", "event.locked", {"event_id": e.id})
    for e in db.query(Event).filter(Event.status.in_(["PUBLISHED", "LOCKED"]), Event.end_at <= now).all():
        if core.checkin_count(db, e.id) >= e.min_checkins:
            e.status = "COMPLETED"
            core.ensure_payout(db, e)
            emit(db, f"event:{e.id}", "event.completed", {"event_id": e.id})
        else:
            e.status = "NEEDS_REVIEW"
            emit(db, "admin", "event.needs_review", {"event_id": e.id})


def queue_reminders(db):
    now = utcnow()
    for e in db.query(Event).filter(Event.status.in_(["PUBLISHED", "LOCKED"]), Event.start_at > now,
                                    Event.start_at <= now + timedelta(hours=24)).all():
        for o in db.query(Order).filter(Order.event_id == e.id, Order.status == "PAID").all():
            core.queue_notification(db, "REMINDER", o.email, "order", o.id, dedupe=f"reminder:{o.id}")


def process_refunds(db):
    provider = get_payouts()
    for r in db.query(Refund).filter(Refund.status == "PENDING").all():
        try:
            r.provider_ref = provider.send("REFUND", r.idempotency_key, r.amount_kobo, {})
            r.status = "PAID"
            emit(db, f"order:{r.order_id}", "refund.completed", {"ticket_id": r.ticket_id, "amount_kobo": r.amount_kobo})
            if r.reason != "EVENT_CANCELLED":
                o = db.get(Order, r.order_id)
                core.queue_notification(db, "REFUND", o.email, "refund", r.id, dedupe=f"refund:{r.id}")
        except Exception as exc:
            r.attempts += 1
            if r.attempts >= 5:
                r.status = "FAILED"
                emit(db, "admin", "refund.failed", {"refund_id": r.id, "error": str(exc)[:200]})


def process_payouts(db):
    provider = get_payouts()
    for p in db.query(Payout).filter(Payout.status == "PENDING").all():
        e = db.get(Event, p.event_id)
        if not core.organiser_ready(db, e.organiser_id):
            p.status = "HELD"
            p.hold_reason = "Organiser approval and a verified payout account are required"
            emit(db, "admin", "payout.held", {"payout_id": p.id, "event_id": e.id})
            continue
        try:
            p.provider_ref = provider.send("PAYOUT", f"event-{e.id}", p.amount_kobo, {})
        except Exception as exc:
            p.status = "FAILED"
            p.hold_reason = str(exc)[:190]
            emit(db, "admin", "payout.failed", {"payout_id": p.id})
            continue
        p.status = "PAID"
        db.add(LedgerEntry(event_id=e.id, type="PLATFORM_FEE", amount_kobo=-p.fee_kobo, ref_type="payout", ref_id=p.id))
        db.add(LedgerEntry(event_id=e.id, type="ORGANISER_PAYOUT", amount_kobo=-p.amount_kobo, ref_type="payout", ref_id=p.id))
        e.status = "PAID_OUT"
        emit(db, f"event:{e.id}", "payout.completed", {"amount_kobo": p.amount_kobo})


def send_notifications(db):
    now = utcnow()
    for n in db.query(Notification).filter(Notification.status == "PENDING", Notification.next_attempt_at <= now).limit(20).all():
        try:
            mailer.send(mailer.build_message(db, n), n.dedupe_key)
            n.status = "SENT"
            n.sent_at = utcnow()
            n.error = None
        except Exception as exc:
            n.attempts += 1
            n.error = str(exc)[:300]
            if n.attempts >= 5:
                n.status = "FAILED"
                emit(db, "admin", "email.failed", {"notification_id": n.id, "type": n.type})
            else:
                n.next_attempt_at = now + timedelta(seconds=30 * 2 ** n.attempts)


def tick():
    steps = [expire_orders, lock_and_complete, queue_reminders, process_refunds, process_payouts, send_notifications]
    for step in steps:
        with SessionLocal() as db:
            try:
                step(db)
                db.commit()
            except Exception:
                db.rollback()
                log.exception("worker step failed: %s", step.__name__)


async def run():
    while True:
        try:
            await asyncio.wait_for(R.kick_event.wait(), settings.worker_interval)
        except asyncio.TimeoutError:
            pass
        R.kick_event.clear()
        await asyncio.to_thread(tick)
