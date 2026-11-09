import json
import secrets
from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..config import settings
from ..models import (CheckIn, Event, LedgerEntry, Notification, Order, OrderItem, Payment, Payout, PayoutAccount,
                      Refund, Ticket, TicketType, User, AuditLog)
from ..realtime import after_commit, emit
from ..runtime import kick
from ..util import utcnow
from .gateway import get_gateway


def cancel_deadline(event: Event):
    return event.start_at - timedelta(hours=settings.cancel_window_hours)


def audit(db: Session, actor: str, action: str, entity: str, detail: str = ""):
    db.add(AuditLog(actor=actor, action=action, entity=entity, detail=detail))


def sold_count(db, tt_id) -> int:
    return db.query(func.count(Ticket.id)).filter(Ticket.ticket_type_id == tt_id, Ticket.status == "VALID").scalar() or 0


def reserved_count(db, tt_id) -> int:
    q = (db.query(func.coalesce(func.sum(OrderItem.quantity), 0)).join(Order, Order.id == OrderItem.order_id)
         .filter(OrderItem.ticket_type_id == tt_id, Order.status == "PENDING", Order.expires_at > utcnow()))
    return int(q.scalar() or 0)


def available(db, tt: TicketType) -> int:
    return max(0, tt.quantity - sold_count(db, tt.id) - reserved_count(db, tt.id))


def mode_load(db, event_id: int, mode: str) -> int:
    sold = (db.query(func.count(Ticket.id)).join(Order, Order.id == Ticket.order_id)
            .filter(Order.event_id == event_id, Ticket.attendance_mode == mode, Ticket.status == "VALID").scalar() or 0)
    reserved = (db.query(func.coalesce(func.sum(OrderItem.quantity), 0)).join(Order, Order.id == OrderItem.order_id)
                .filter(Order.event_id == event_id, Order.attendance_mode == mode, Order.status == "PENDING",
                        Order.expires_at > utcnow()).scalar() or 0)
    return int(sold) + int(reserved)


def queue_notification(db, type_, recipient, ref_type, ref_id, dedupe=None):
    key = dedupe or f"{type_}:{ref_type}:{ref_id}:{secrets.token_hex(4)}"
    if dedupe and db.query(Notification.id).filter(Notification.dedupe_key == dedupe).first():
        return None
    n = Notification(type=type_, recipient=recipient, ref_type=ref_type, ref_id=ref_id, dedupe_key=key)
    db.add(n)
    db.flush()
    after_commit(db, kick)
    return n


def can_cancel(o: Order, e: Event):
    if o.status != "PAID":
        return False, "Order is not paid"
    if e.status == "CANCELLED":
        return False, "The event was cancelled and refunds are being processed"
    if e.status in ("COMPLETED", "PAID_OUT", "NEEDS_REVIEW"):
        return False, "The event has ended"
    if not (o.cancellation_allowed or e.materially_changed):
        return False, "This event does not allow cancellations"
    if utcnow() > cancel_deadline(e):
        return False, "The cancellation window has closed"
    return True, ""


def finalize_order(db: Session, order: Order) -> Order:
    if order.status == "PAID":
        return order
    event = db.get(Event, order.event_id)
    names = json.loads(order.guest_names) if order.guest_names else []
    n = 0
    for item in order.items:
        for _ in range(item.quantity):
            db.add(Ticket(order_id=order.id, ticket_type_id=item.ticket_type_id, status="VALID",
                          attendance_mode=order.attendance_mode,
                          guest_name=(names[n] if n < len(names) and names[n] else None),
                          join_token=secrets.token_urlsafe(12) if order.attendance_mode == "ONLINE" else None))
            n += 1
    order.status = "PAID"
    order.paid_at = utcnow()
    db.flush()
    if order.amount_kobo > 0:
        db.add(LedgerEntry(event_id=event.id, type="TICKET_SALE", amount_kobo=order.amount_kobo, ref_type="order", ref_id=order.id))
    queue_notification(db, "CONFIRMATION", order.email, "order", order.id, dedupe=f"confirm:{order.id}")
    emit(db, f"order:{order.id}", "order.paid", {"order_id": order.id})
    emit(db, f"event:{event.id}", "sale.recorded", {"order_id": order.id, "quantity": n, "amount_kobo": order.amount_kobo})
    emit(db, "admin", "order.paid", {"order_id": order.id, "event_id": event.id, "amount_kobo": order.amount_kobo})
    return order


def verify_order(db: Session, order: Order) -> bool:
    """Ask the gateway about each checkout attempt of this order. Finalises the order if paid."""
    if order.status == "PAID":
        return True
    gw = get_gateway()
    for p in db.query(Payment).filter(Payment.order_id == order.id).order_by(Payment.id.desc()).all():
        res = gw.verify(p.txn_ref, order.amount_kobo)
        p.raw = json.dumps(res.raw)[:2000]
        if res.paid:
            p.status = "SUCCESS"
            p.verified_amount_kobo = res.amount_kobo
            finalize_order(db, order)
            return True
    return False


def create_refund(db: Session, ticket: Ticket, order: Order, reason: str):
    ticket.status = "CANCELLED"
    unit = (db.query(OrderItem.unit_price_kobo).filter(OrderItem.order_id == order.id,
            OrderItem.ticket_type_id == ticket.ticket_type_id).scalar() or 0)
    if unit > 0:
        db.add(Refund(ticket_id=ticket.id, order_id=order.id, event_id=order.event_id, amount_kobo=unit,
                      reason=reason, idempotency_key=f"refund:{ticket.id}"))
        db.add(LedgerEntry(event_id=order.event_id, type="REFUND", amount_kobo=-unit, ref_type="ticket", ref_id=ticket.id))
    emit(db, f"order:{order.id}", "ticket.cancelled", {"ticket_id": ticket.id})
    emit(db, f"event:{order.event_id}", "ticket.cancelled", {"ticket_id": ticket.id})
    after_commit(db, kick)


def cancel_event(db: Session, event: Event, actor: str):
    event.status = "CANCELLED"
    orders = db.query(Order).filter(Order.event_id == event.id, Order.status == "PAID").all()
    for o in orders:
        for t in db.query(Ticket).filter(Ticket.order_id == o.id, Ticket.status == "VALID").all():
            create_refund(db, t, o, "EVENT_CANCELLED")
        queue_notification(db, "EVENT_CANCELLED", o.email, "order", o.id, dedupe=f"evcancel:{o.id}")
        emit(db, f"order:{o.id}", "event.cancelled", {"event_id": event.id})
    audit(db, actor, "event.cancel", f"event:{event.id}")


def held_balance(db, event_id) -> int:
    return int(db.query(func.coalesce(func.sum(LedgerEntry.amount_kobo), 0)).filter(LedgerEntry.event_id == event_id).scalar() or 0)


def ensure_payout(db, event: Event):
    p = db.query(Payout).filter(Payout.event_id == event.id).first()
    if p:
        return p
    held = held_balance(db, event.id)
    fee = int(round(held * settings.platform_fee_percent / 100))
    p = Payout(event_id=event.id, gross_kobo=held, fee_kobo=fee, amount_kobo=held - fee)
    db.add(p)
    db.flush()
    return p


def checkin_count(db, event_id) -> int:
    return (db.query(func.count(CheckIn.id)).join(Ticket, Ticket.id == CheckIn.ticket_id)
            .join(Order, Order.id == Ticket.order_id).filter(Order.event_id == event_id).scalar() or 0)


def organiser_ready(db, organiser_id) -> bool:
    u = db.get(User, organiser_id)
    acct = db.query(PayoutAccount).filter(PayoutAccount.organiser_id == organiser_id).first()
    return bool(u and u.approved and acct and acct.verified)
