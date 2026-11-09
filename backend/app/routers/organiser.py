import csv
import io
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import AfterValidator, BaseModel, EmailStr, Field, model_validator
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import require_organiser
from ..models import (CheckIn, Event, EventMedia, LedgerEntry, Order, Payout, PayoutAccount, SlugRedirect, Ticket,
                      TicketType, User)
from ..realtime import emit
from ..security import read_token
from ..serialize import event_card, event_public, media_url
from ..services import core
from ..util import RESERVED_SLUGS, iso, slugify, utcnow, year_of

router = APIRouter(prefix="/api/organiser")


def _utc(dt: datetime):
    return dt.astimezone(timezone.utc).replace(tzinfo=None) if dt.tzinfo else dt


UtcDt = Annotated[datetime, AfterValidator(_utc)]


class EventIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    slug: Optional[str] = None
    description: str = ""
    category: str = "community"
    start_at: UtcDt
    end_at: UtcDt
    timezone: str = "Africa/Lagos"
    attendance_mode: str = Field(default="PHYSICAL", pattern="^(PHYSICAL|ONLINE|BOTH)$")
    cancellation_allowed: bool = True
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    map_url: Optional[str] = None
    physical_capacity: Optional[int] = Field(default=None, ge=1)
    online_platform: Optional[str] = None
    online_url: Optional[str] = None
    online_capacity: Optional[int] = Field(default=None, ge=1)
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    visibility: str = Field(default="PUBLIC", pattern="^(PUBLIC|UNLISTED)$")
    min_checkins: int = Field(default=1, ge=0)

    @model_validator(mode="after")
    def _check(self):
        if self.end_at <= self.start_at:
            raise ValueError("The end time must be after the start time")
        try:
            ZoneInfo(self.timezone)
        except Exception:
            raise ValueError("Unknown timezone")
        return self


class EventPatch(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    slug: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    start_at: Optional[UtcDt] = None
    end_at: Optional[UtcDt] = None
    timezone: Optional[str] = None
    attendance_mode: Optional[str] = Field(default=None, pattern="^(PHYSICAL|ONLINE|BOTH)$")
    cancellation_allowed: Optional[bool] = None
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    map_url: Optional[str] = None
    physical_capacity: Optional[int] = None
    online_platform: Optional[str] = None
    online_url: Optional[str] = None
    online_capacity: Optional[int] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    contact_whatsapp: Optional[str] = None
    visibility: Optional[str] = Field(default=None, pattern="^(PUBLIC|UNLISTED)$")
    min_checkins: Optional[int] = Field(default=None, ge=0)


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    price_kobo: int = Field(ge=0)
    quantity: int = Field(ge=1)
    max_per_order: int = Field(default=10, ge=1, le=100)
    allowed_modes: str = "PHYSICAL,ONLINE"
    sales_start: Optional[UtcDt] = None
    sales_end: Optional[UtcDt] = None
    sort_order: int = 0
    is_hidden: bool = False


class CategoryPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_kobo: Optional[int] = Field(default=None, ge=0)
    quantity: Optional[int] = Field(default=None, ge=1)
    max_per_order: Optional[int] = Field(default=None, ge=1, le=100)
    allowed_modes: Optional[str] = None
    sales_start: Optional[UtcDt] = None
    sales_end: Optional[UtcDt] = None
    sort_order: Optional[int] = None
    is_hidden: Optional[bool] = None


class PayoutAccountIn(BaseModel):
    bank_code: str = Field(min_length=2, max_length=20)
    account_number: str = Field(min_length=10, max_length=10, pattern="^[0-9]{10}$")
    account_name: str = Field(min_length=2, max_length=160)


class CheckinIn(BaseModel):
    qr_token: str


def own_event(db: Session, user: User, event_id: int) -> Event:
    e = db.get(Event, event_id)
    if not e or (e.organiser_id != user.id and user.role != "admin"):
        raise HTTPException(404, "Event not found")
    return e


def unique_slug(db, base: str, year: int, exclude: Optional[int] = None) -> str:
    base = slugify(base)
    if base in RESERVED_SLUGS:
        base += "-event"
    s, i = base, 2
    while db.query(Event.id).filter(Event.slug == s, Event.year == year, Event.id != (exclude or 0)).first():
        s = f"{base}-{i}"
        i += 1
    return s


def _validate_modes(allowed: str):
    if not allowed or any(m not in ("PHYSICAL", "ONLINE") for m in allowed.split(",")):
        raise HTTPException(422, "allowed_modes must be PHYSICAL, ONLINE or both, separated by a comma")


@router.get("/events")
def my_events(user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    q = db.query(Event).order_by(Event.start_at.desc())
    if user.role != "admin":
        q = q.filter(Event.organiser_id == user.id)
    out = []
    for e in q.all():
        c = event_card(e)
        c["status"] = e.status
        c["tickets_sold"] = db.query(func.count(Ticket.id)).join(Order, Order.id == Ticket.order_id).filter(
            Order.event_id == e.id, Ticket.status == "VALID").scalar() or 0
        out.append(c)
    return out


@router.post("/events")
def create_event(body: EventIn, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    year = year_of(body.start_at, body.timezone)
    data = body.model_dump(exclude={"slug"})
    e = Event(**data, organiser_id=user.id, year=year, slug=unique_slug(db, body.slug or body.title, year))
    db.add(e)
    db.commit()
    return event_public(db, e, True)


@router.get("/events/{event_id}")
def get_event(event_id: int, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    e = own_event(db, user, event_id)
    d = event_public(db, e, True)
    d["stats"] = _stats(db, e)
    return d


@router.patch("/events/{event_id}")
def patch_event(event_id: int, body: EventPatch, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    e = own_event(db, user, event_id)
    if e.status in ("CANCELLED", "COMPLETED", "PAID_OUT", "NEEDS_REVIEW"):
        raise HTTPException(400, "This event can no longer be edited")
    data = body.model_dump(exclude_unset=True)
    old = (e.slug, e.year, e.start_at, e.attendance_mode, e.venue_address)
    slug_in = data.pop("slug", None)
    for k, v in data.items():
        setattr(e, k, v)
    if e.end_at <= e.start_at:
        raise HTTPException(422, "The end time must be after the start time")
    if {"start_at", "timezone"} & data.keys() or slug_in:
        e.year = year_of(e.start_at, e.timezone)
        e.slug = unique_slug(db, slug_in or e.slug, e.year, e.id)
    if (e.slug, e.year) != (old[0], old[1]):
        db.query(SlugRedirect).filter(SlugRedirect.old_slug == e.slug, SlugRedirect.old_year == e.year).delete()
        if e.status != "DRAFT" and not db.query(SlugRedirect.id).filter(SlugRedirect.old_slug == old[0], SlugRedirect.old_year == old[1]).first():
            db.add(SlugRedirect(event_id=e.id, old_slug=old[0], old_year=old[1]))
    material = (e.start_at, e.attendance_mode, e.venue_address) != old[2:]
    if material and e.status in ("PUBLISHED", "LOCKED"):
        orders = db.query(Order).filter(Order.event_id == e.id, Order.status == "PAID").all()
        if orders:
            e.materially_changed = True
            if e.status == "LOCKED" and utcnow() < core.cancel_deadline(e):
                e.status = "PUBLISHED"
            stamp = int(utcnow().timestamp())
            for o in orders:
                core.queue_notification(db, "EVENT_UPDATED", o.email, "order", o.id, dedupe=f"evupd:{o.id}:{stamp}")
                emit(db, f"order:{o.id}", "event.updated", {"event_id": e.id})
    db.commit()
    return event_public(db, e, True)


@router.post("/events/{event_id}/publish")
def publish(event_id: int, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    e = own_event(db, user, event_id)
    if e.status != "DRAFT":
        raise HTTPException(400, "Only draft events can be published")
    missing = []
    if not any(not t.is_hidden for t in e.categories):
        missing.append("at least one ticket category")
    if e.attendance_mode in ("PHYSICAL", "BOTH") and not (e.venue_name and e.venue_address):
        missing.append("venue name and address")
    if e.attendance_mode in ("ONLINE", "BOTH") and not e.online_url:
        missing.append("online join link")
    if not (e.contact_email or e.contact_phone):
        missing.append("contact email or phone")
    if e.start_at <= utcnow():
        missing.append("a start time in the future")
    if missing:
        raise HTTPException(422, "Before publishing add: " + ", ".join(missing))
    e.status = "PUBLISHED"
    core.audit(db, user.email, "event.publish", f"event:{e.id}")
    db.commit()
    return event_public(db, e, True)


@router.post("/events/{event_id}/cancel")
def cancel(event_id: int, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    e = own_event(db, user, event_id)
    if e.status in ("CANCELLED", "COMPLETED", "PAID_OUT"):
        raise HTTPException(400, "This event can no longer be cancelled")
    core.cancel_event(db, e, user.email)
    db.commit()
    return event_public(db, e, True)


@router.post("/events/{event_id}/categories")
def add_category(event_id: int, body: CategoryIn, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    e = own_event(db, user, event_id)
    _validate_modes(body.allowed_modes)
    db.add(TicketType(event_id=e.id, **body.model_dump()))
    db.commit()
    db.refresh(e)
    return event_public(db, e, True)


def _category(db, user, cat_id) -> TicketType:
    t = db.get(TicketType, cat_id)
    if not t:
        raise HTTPException(404, "Category not found")
    own_event(db, user, t.event_id)
    return t


@router.patch("/categories/{cat_id}")
def patch_category(cat_id: int, body: CategoryPatch, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    t = _category(db, user, cat_id)
    data = body.model_dump(exclude_unset=True)
    if "allowed_modes" in data:
        _validate_modes(data["allowed_modes"])
    if ("price_kobo" in data) and core.sold_count(db, t.id) > 0:
        raise HTTPException(400, "The price cannot change after tickets were sold. Hide this category and add a new one")
    if "quantity" in data and data["quantity"] < core.sold_count(db, t.id):
        raise HTTPException(400, "Quantity cannot be below the tickets already sold")
    for k, v in data.items():
        setattr(t, k, v)
    db.commit()
    return event_public(db, db.get(Event, t.event_id), True)


@router.delete("/categories/{cat_id}")
def delete_category(cat_id: int, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    t = _category(db, user, cat_id)
    e = db.get(Event, t.event_id)
    if core.sold_count(db, t.id) > 0:
        t.is_hidden = True
    else:
        db.delete(t)
    db.commit()
    db.refresh(e)
    return event_public(db, e, True)


ALLOWED_UPLOADS = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "application/pdf": ".pdf"}


@router.post("/events/{event_id}/media")
def upload_media(event_id: int, kind: str = Form("FLYER"), file: UploadFile = File(...),
                 user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    e = own_event(db, user, event_id)
    ext = ALLOWED_UPLOADS.get(file.content_type or "")
    if not ext or kind not in ("FLYER", "GALLERY", "COVER"):
        raise HTTPException(422, "Upload a PNG, JPEG, WebP or PDF file")
    data = file.file.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(413, "Files can be at most 5 MB")
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    name = secrets.token_hex(10) + ext
    (settings.upload_dir / name).write_bytes(data)
    db.add(EventMedia(event_id=e.id, kind=kind, path=name, content_type=file.content_type, sort_order=len(e.media)))
    db.commit()
    db.refresh(e)
    return event_public(db, e, True)


@router.delete("/media/{media_id}")
def delete_media(media_id: int, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    m = db.get(EventMedia, media_id)
    if not m:
        raise HTTPException(404)
    e = own_event(db, user, m.event_id)
    Path(settings.upload_dir / m.path).unlink(missing_ok=True)
    db.delete(m)
    db.commit()
    db.refresh(e)
    return event_public(db, e, True)


def _attendees(db, e: Event, q=None, mode=None, status=None):
    checked = {tid for (tid,) in db.query(CheckIn.ticket_id)}
    rows = (db.query(Ticket, Order, TicketType).join(Order, Order.id == Ticket.order_id)
            .join(TicketType, TicketType.id == Ticket.ticket_type_id)
            .filter(Order.event_id == e.id, Order.status == "PAID").order_by(Ticket.id).all())
    out = []
    for t, o, c in rows:
        name = f"{o.first_name} {o.last_name}"
        if mode and t.attendance_mode != mode:
            continue
        if status and t.status != status:
            continue
        if q and q.lower() not in f"{name} {o.email} {o.phone} {o.reference} {t.guest_name or ''}".lower():
            continue
        out.append({"ticket_id": t.id, "name": name, "guest_name": t.guest_name, "email": o.email, "phone": o.phone,
                    "category": c.name, "mode": t.attendance_mode, "status": t.status, "checked_in": t.id in checked,
                    "order_reference": o.reference, "order_id": o.id})
    return out


@router.get("/events/{event_id}/attendees")
def attendees(event_id: int, q: Optional[str] = None, mode: Optional[str] = None, status: Optional[str] = None,
              user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    return _attendees(db, own_event(db, user, event_id), q, mode, status)


@router.get("/events/{event_id}/attendees.csv")
def attendees_csv(event_id: int, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    rows = _attendees(db, own_event(db, user, event_id))
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["name", "guest_name", "email", "phone", "category", "mode", "status", "checked_in", "order_reference"])
    for r in rows:
        w.writerow([r["name"], r["guest_name"] or "", r["email"], r["phone"], r["category"], r["mode"], r["status"], r["checked_in"], r["order_reference"]])
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="attendees-{event_id}.csv"'})


@router.post("/events/{event_id}/orders/{order_id}/resend")
def resend(event_id: int, order_id: int, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    e = own_event(db, user, event_id)
    o = db.get(Order, order_id)
    if not o or o.event_id != e.id or o.status != "PAID":
        raise HTTPException(404, "Order not found")
    core.queue_notification(db, "CONFIRMATION", o.email, "order", o.id, dedupe=f"resend:{o.id}:{utcnow():%Y%m%d%H%M%S}")
    db.commit()
    return {"ok": True}


def _stats(db, e: Event) -> dict:
    def ledger(t):
        return int(db.query(func.coalesce(func.sum(LedgerEntry.amount_kobo), 0)).filter(LedgerEntry.event_id == e.id, LedgerEntry.type == t).scalar() or 0)
    sold = db.query(func.count(Ticket.id)).join(Order, Order.id == Ticket.order_id).filter(Order.event_id == e.id, Ticket.status == "VALID").scalar() or 0
    cancelled = db.query(func.count(Ticket.id)).join(Order, Order.id == Ticket.order_id).filter(Order.event_id == e.id, Ticket.status == "CANCELLED").scalar() or 0
    p = db.query(Payout).filter(Payout.event_id == e.id).first()
    return {"tickets_sold": sold, "tickets_cancelled": cancelled, "gross_kobo": ledger("TICKET_SALE"),
            "refunded_kobo": -ledger("REFUND"), "held_kobo": core.held_balance(db, e.id), "checkins": core.checkin_count(db, e.id),
            "payout": ({"status": p.status, "amount_kobo": p.amount_kobo, "fee_kobo": p.fee_kobo, "hold_reason": p.hold_reason} if p else None)}


@router.get("/events/{event_id}/ledger")
def ledger(event_id: int, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    e = own_event(db, user, event_id)
    rows = db.query(LedgerEntry).filter(LedgerEntry.event_id == e.id).order_by(LedgerEntry.id).all()
    return {"entries": [{"id": r.id, "type": r.type, "amount_kobo": r.amount_kobo, "ref_type": r.ref_type, "ref_id": r.ref_id, "at": iso(r.created_at)} for r in rows],
            "held_kobo": core.held_balance(db, e.id), "stats": _stats(db, e)}


@router.get("/events/{event_id}/manifest")
def manifest(event_id: int, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    from ..services.mailer import ticket_qr_token
    e = own_event(db, user, event_id)
    rows = (db.query(Ticket, Order).join(Order, Order.id == Ticket.order_id)
            .filter(Order.event_id == e.id, Order.status == "PAID", Ticket.status == "VALID", Ticket.attendance_mode == "PHYSICAL").all())
    return [{"ticket_id": t.id, "name": f"{o.first_name} {o.last_name}", "qr_token": ticket_qr_token(t.id)} for t, o in rows]


@router.post("/checkins")
def checkin(body: CheckinIn, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    data = read_token("qr", body.qr_token)
    t = db.get(Ticket, data["t"]) if data else None
    if not t:
        return {"result": "INVALID"}
    o = db.get(Order, t.order_id)
    e = db.get(Event, o.event_id)
    if (e.organiser_id != user.id and user.role != "admin") or e.status in ("CANCELLED", "DRAFT"):
        return {"result": "INVALID"}
    info = {"ticket_id": t.id, "name": f"{o.first_name} {o.last_name}", "guest_name": t.guest_name,
            "category": db.get(TicketType, t.ticket_type_id).name}
    if t.status != "VALID":
        return {"result": "CANCELLED", "ticket": info}
    if t.attendance_mode != "PHYSICAL":
        return {"result": "WRONG_MODE", "ticket": info}
    try:
        db.add(CheckIn(ticket_id=t.id, method="QR_SCAN", scanner_id=user.id))
        db.flush()
        emit(db, f"event:{e.id}", "checkin.recorded", {"ticket_id": t.id, "method": "QR_SCAN"})
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"result": "ALREADY_USED", "ticket": info}
    return {"result": "VALID", "ticket": info}


@router.put("/payout-account")
def set_payout_account(body: PayoutAccountIn, user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    a = db.query(PayoutAccount).filter(PayoutAccount.organiser_id == user.id).first()
    if not a:
        a = PayoutAccount(organiser_id=user.id, **body.model_dump())
        db.add(a)
    else:
        for k, v in body.model_dump().items():
            setattr(a, k, v)
    a.verified = False  # an admin verifies the account name before the first payout
    db.commit()
    return {"bank_code": a.bank_code, "account_number": "******" + a.account_number[-4:], "account_name": a.account_name, "verified": a.verified}


@router.get("/payout-account")
def get_payout_account(user: User = Depends(require_organiser), db: Session = Depends(get_db)):
    a = db.query(PayoutAccount).filter(PayoutAccount.organiser_id == user.id).first()
    if not a:
        return None
    return {"bank_code": a.bank_code, "account_number": "******" + a.account_number[-4:], "account_name": a.account_name, "verified": a.verified}
