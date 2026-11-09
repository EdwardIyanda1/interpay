from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import require_admin
from ..models import (AuditLog, Event, LedgerEntry, Notification, Order, Payment, Payout, PayoutAccount, Refund,
                      Ticket, User)
from ..realtime import emit
from ..runtime import kick
from ..services import core
from ..util import iso, utcnow

router = APIRouter(prefix="/api/admin")


def _sum(db, t) -> int:
    return int(db.query(func.coalesce(func.sum(LedgerEntry.amount_kobo), 0)).filter(LedgerEntry.type == t).scalar() or 0)


@router.get("/stats")
def stats(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return {
        "tickets_sold": db.query(func.count(Ticket.id)).filter(Ticket.status == "VALID").scalar() or 0,
        "gross_kobo": _sum(db, "TICKET_SALE"), "refunded_kobo": -_sum(db, "REFUND"),
        "held_kobo": int(db.query(func.coalesce(func.sum(LedgerEntry.amount_kobo), 0)).scalar() or 0),
        "paid_out_kobo": -_sum(db, "ORGANISER_PAYOUT"), "platform_fees_kobo": -_sum(db, "PLATFORM_FEE"),
        "events": db.query(func.count(Event.id)).scalar() or 0,
        "organisers_pending": db.query(func.count(User.id)).filter(User.role == "organiser", User.approved == False).scalar() or 0,  # noqa: E712
        "emails_failed": db.query(func.count(Notification.id)).filter(Notification.status == "FAILED").scalar() or 0,
        "payouts_held": db.query(func.count(Payout.id)).filter(Payout.status == "HELD").scalar() or 0,
        "payout_mode": settings.payout_provider, "gateway": settings.gateway,
    }


@router.get("/organisers")
def organisers(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    out = []
    for u in db.query(User).filter(User.role == "organiser").order_by(User.id.desc()).all():
        a = db.query(PayoutAccount).filter(PayoutAccount.organiser_id == u.id).first()
        out.append({"id": u.id, "email": u.email, "name": u.name, "approved": u.approved, "suspended": u.suspended,
                    "events": db.query(func.count(Event.id)).filter(Event.organiser_id == u.id).scalar() or 0,
                    "payout_account": ({"bank_code": a.bank_code, "account_number": "******" + a.account_number[-4:],
                                        "account_name": a.account_name, "verified": a.verified} if a else None)})
    return out


def _user(db, uid) -> User:
    u = db.get(User, uid)
    if not u or u.role != "organiser":
        raise HTTPException(404, "Organiser not found")
    return u


@router.post("/organisers/{uid}/approve")
def approve(uid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = _user(db, uid)
    u.approved, u.suspended = True, False
    core.audit(db, admin.email, "organiser.approve", f"user:{uid}")
    db.commit()
    return {"ok": True}


@router.post("/organisers/{uid}/suspend")
def suspend(uid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = _user(db, uid)
    u.suspended = True
    core.audit(db, admin.email, "organiser.suspend", f"user:{uid}")
    db.commit()
    return {"ok": True}


@router.post("/organisers/{uid}/verify-payout-account")
def verify_account(uid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    a = db.query(PayoutAccount).filter(PayoutAccount.organiser_id == uid).first()
    if not a:
        raise HTTPException(404, "No payout account")
    a.verified = True
    core.audit(db, admin.email, "payout_account.verify", f"user:{uid}")
    db.commit()
    return {"ok": True}


@router.get("/events")
def events(q: Optional[str] = None, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    query = db.query(Event).order_by(Event.id.desc())
    if q:
        query = query.filter(Event.title.ilike(f"%{q}%"))
    return [{"id": e.id, "title": e.title, "slug": e.slug, "year": e.year, "status": e.status, "organiser_id": e.organiser_id,
             "start_at": iso(e.start_at), "held_kobo": core.held_balance(db, e.id)} for e in query.limit(100)]


@router.post("/events/{eid}/unpublish")
def unpublish(eid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    e = db.get(Event, eid)
    if not e:
        raise HTTPException(404)
    if e.status in ("PUBLISHED", "LOCKED"):
        e.status = "DRAFT"
    core.audit(db, admin.email, "event.unpublish", f"event:{eid}")
    db.commit()
    return {"ok": True, "status": e.status}


@router.post("/events/{eid}/cancel")
def force_cancel(eid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    e = db.get(Event, eid)
    if not e or e.status in ("CANCELLED", "PAID_OUT"):
        raise HTTPException(400, "Event cannot be cancelled")
    core.cancel_event(db, e, admin.email)
    db.commit()
    return {"ok": True}


@router.get("/orders")
def orders(q: Optional[str] = None, status: Optional[str] = None, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    query = db.query(Order).order_by(Order.id.desc())
    if status:
        query = query.filter(Order.status == status)
    if q:
        query = query.filter(or_(Order.email.ilike(f"%{q}%"), Order.reference.ilike(f"%{q}%"), Order.phone.ilike(f"%{q}%")))
    out = []
    for o in query.limit(100):
        e = db.get(Event, o.event_id)
        out.append({"id": o.id, "reference": o.reference, "status": o.status, "amount_kobo": o.amount_kobo, "email": o.email,
                    "event": e.title, "created_at": iso(o.created_at),
                    "attempts": db.query(func.count(Payment.id)).filter(Payment.order_id == o.id).scalar() or 0})
    return out


@router.post("/orders/{oid}/reconcile")
def reconcile(oid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404)
    paid = core.verify_order(db, o)
    core.audit(db, admin.email, "order.reconcile", f"order:{oid}", f"paid={paid}")
    db.commit()
    return {"paid": paid, "status": o.status}


@router.get("/refunds")
def refunds(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [{"id": r.id, "ticket_id": r.ticket_id, "order_id": r.order_id, "amount_kobo": r.amount_kobo, "status": r.status,
             "reason": r.reason, "attempts": r.attempts, "created_at": iso(r.created_at)}
            for r in db.query(Refund).order_by(Refund.id.desc()).limit(100)]


@router.get("/payouts")
def payouts(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [{"id": p.id, "event_id": p.event_id, "event": db.get(Event, p.event_id).title, "gross_kobo": p.gross_kobo,
             "fee_kobo": p.fee_kobo, "amount_kobo": p.amount_kobo, "status": p.status, "hold_reason": p.hold_reason,
             "provider_ref": p.provider_ref} for p in db.query(Payout).order_by(Payout.id.desc()).limit(100)]


def _payout(db, pid) -> Payout:
    p = db.get(Payout, pid)
    if not p:
        raise HTTPException(404)
    return p


@router.post("/payouts/{pid}/hold")
def hold(pid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    p = _payout(db, pid)
    if p.status in ("PENDING", "FAILED"):
        p.status, p.hold_reason = "HELD", "Held by admin"
    core.audit(db, admin.email, "payout.hold", f"payout:{pid}")
    db.commit()
    return {"status": p.status}


@router.post("/payouts/{pid}/release")
def release(pid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    p = _payout(db, pid)
    if p.status in ("HELD", "FAILED"):
        p.status, p.hold_reason = "PENDING", None
    core.audit(db, admin.email, "payout.release", f"payout:{pid}")
    db.commit()
    kick()
    return {"status": p.status}


@router.get("/notifications")
def notifications(status: Optional[str] = None, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    q = db.query(Notification).order_by(Notification.id.desc())
    if status:
        q = q.filter(Notification.status == status)
    return [{"id": n.id, "type": n.type, "recipient": n.recipient, "status": n.status, "attempts": n.attempts,
             "error": n.error, "sent_at": iso(n.sent_at), "created_at": iso(n.created_at)} for n in q.limit(100)]


@router.post("/notifications/{nid}/resend")
def resend(nid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    n = db.get(Notification, nid)
    if not n:
        raise HTTPException(404)
    n.status, n.attempts, n.next_attempt_at, n.error = "PENDING", 0, utcnow(), None
    core.audit(db, admin.email, "notification.resend", f"notification:{nid}")
    db.commit()
    kick()
    return {"ok": True}


@router.get("/audit-log")
def audit_log(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [{"id": a.id, "actor": a.actor, "action": a.action, "entity": a.entity, "detail": a.detail, "at": iso(a.at)}
            for a in db.query(AuditLog).order_by(AuditLog.id.desc()).limit(200)]


@router.get("/settings")
def get_settings(_: User = Depends(require_admin)):
    return {"platform_fee_percent": settings.platform_fee_percent, "cancel_window_hours": settings.cancel_window_hours,
            "reservation_minutes": settings.reservation_minutes, "gateway": settings.gateway, "ipg_mode": settings.ipg_mode,
            "payout_provider": settings.payout_provider, "mail_mode": settings.mail_mode}
