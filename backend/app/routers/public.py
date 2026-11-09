import json
import secrets
from datetime import timedelta
from html import escape
from typing import Optional

from fastapi import APIRouter, Depends, Form, Header, HTTPException, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import user_from_header
from ..models import CheckIn, Event, Order, OrderItem, Payment, SlugRedirect, Ticket, TicketType
from ..realtime import emit
from ..security import make_token, read_token
from ..serialize import canonical, event_card, event_public, order_view
from ..services import core
from ..services.gateway import get_gateway
from ..services.mailer import order_token, qr_png, ticket_qr_token
from ..util import normalize_phone, utcnow

router = APIRouter()


class ItemIn(BaseModel):
    ticket_type_id: int
    quantity: int = Field(ge=1, le=100)


class OrderIn(BaseModel):
    event_id: int
    items: list[ItemIn] = Field(min_length=1)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    phone: str
    attendance_mode: Optional[str] = None
    accepted_policy: bool
    guest_names: Optional[list[str]] = None
    client: str = "web"


@router.get("/api/events")
def list_events(db: Session = Depends(get_db)):
    rows = (db.query(Event).filter(Event.status.in_(["PUBLISHED", "LOCKED"]), Event.visibility == "PUBLIC",
                                   Event.end_at > utcnow()).order_by(Event.start_at).all())
    return [event_card(e) for e in rows]


@router.get("/api/events/{slug}/{year}")
def event_page(slug: str, year: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    e = db.query(Event).filter(Event.slug == slug, Event.year == year).first()
    if not e:
        r = db.query(SlugRedirect).filter(SlugRedirect.old_slug == slug, SlugRedirect.old_year == year).first()
        e = db.get(Event, r.event_id) if r else None
    if not e:
        raise HTTPException(404, "Event not found")
    owner = False
    if authorization:
        try:
            u = user_from_header(authorization, db)
            owner = u.role == "admin" or u.id == e.organiser_id
        except HTTPException:
            pass
    if e.status == "DRAFT" and not owner:
        raise HTTPException(404, "Event not found")
    return event_public(db, e, owner)


@router.post("/api/orders")
def create_order(body: OrderIn, db: Session = Depends(get_db)):
    now = utcnow()
    e = db.get(Event, body.event_id)
    if not e or e.status not in ("PUBLISHED", "LOCKED"):
        raise HTTPException(404, "This event is not available")
    if now >= e.start_at:
        raise HTTPException(400, "Ticket sales for this event have closed")
    if not body.accepted_policy:
        raise HTTPException(400, "Accept the cancellation policy to continue")
    try:
        phone = normalize_phone(body.phone)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    mode = body.attendance_mode
    if e.attendance_mode == "BOTH":
        if mode not in ("PHYSICAL", "ONLINE"):
            raise HTTPException(400, "Choose whether you will attend physically or online")
    else:
        mode = e.attendance_mode
    merged: dict[int, int] = {}
    for it in body.items:
        merged[it.ticket_type_id] = merged.get(it.ticket_type_id, 0) + it.quantity
    amount, total, lines = 0, 0, []
    for tt_id, qty in merged.items():
        tt = db.query(TicketType).filter(TicketType.id == tt_id, TicketType.event_id == e.id).with_for_update().first()
        if not tt or tt.is_hidden:
            raise HTTPException(404, "Ticket category not found")
        if (tt.sales_start and now < tt.sales_start) or (tt.sales_end and now > tt.sales_end):
            raise HTTPException(400, f"{tt.name} is not on sale right now")
        if mode not in tt.allowed_modes.split(","):
            raise HTTPException(400, f"{tt.name} is not available for {mode.lower()} attendance")
        if qty > tt.max_per_order:
            raise HTTPException(400, f"You can buy at most {tt.max_per_order} {tt.name} tickets per order")
        left = core.available(db, tt)
        if qty > left:
            raise HTTPException(400, f"Only {left} {tt.name} ticket(s) left")
        amount += qty * tt.price_kobo
        total += qty
        lines.append(OrderItem(ticket_type_id=tt.id, quantity=qty, unit_price_kobo=tt.price_kobo))
    cap = e.physical_capacity if mode == "PHYSICAL" else e.online_capacity
    if cap is not None and core.mode_load(db, e.id, mode) + total > cap:
        raise HTTPException(400, f"{mode.title()} attendance is sold out")
    names = [n.strip()[:160] for n in (body.guest_names or [])][:total]
    order = Order(event_id=e.id, reference="IP-" + secrets.token_hex(5).upper(), status="PENDING", amount_kobo=amount,
                  first_name=body.first_name.strip(), last_name=body.last_name.strip(), email=body.email.lower(),
                  phone=phone, attendance_mode=mode, guest_names=json.dumps(names) if names else None,
                  cancellation_allowed=e.cancellation_allowed, policy_accepted_at=now,
                  client="mobile" if body.client == "mobile" else "web",
                  expires_at=now + timedelta(minutes=settings.reservation_minutes), items=lines)
    db.add(order)
    db.flush()
    token = order_token(order.id)
    if amount == 0:
        core.finalize_order(db, order)
    db.commit()
    return {"order_id": order.id, "order_token": token, "reference": order.reference, "amount_kobo": amount,
            "status": order.status, "expires_at": order.expires_at.isoformat() + "Z",
            "checkout_url": f"{settings.api_base_url}/checkout/{token}" if amount > 0 else None}


def _order(db, token: str) -> Order:
    data = read_token("order", token)
    o = db.get(Order, data["oid"]) if data else None
    if not o:
        raise HTTPException(404, "Order not found")
    return o


@router.get("/api/orders/{token}")
def get_order(token: str, db: Session = Depends(get_db)):
    return order_view(db, _order(db, token), token)


@router.post("/api/orders/{token}/verify")
def verify(token: str, db: Session = Depends(get_db)):
    o = _order(db, token)
    core.verify_order(db, o)
    db.commit()
    return order_view(db, o, token)


@router.post("/api/orders/{token}/resend-confirmation")
def resend(token: str, db: Session = Depends(get_db)):
    o = _order(db, token)
    if o.status != "PAID":
        raise HTTPException(400, "Order is not paid")
    core.queue_notification(db, "CONFIRMATION", o.email, "order", o.id, dedupe=f"resend:{o.id}:{utcnow():%Y%m%d%H%M}")
    db.commit()
    return {"ok": True}


def _page(title: str, body: str) -> str:
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{escape(title)} | InterPay</title><link rel="preconnect" href="https://fonts.googleapis.com">'
            f'<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap" rel="stylesheet">'
            f'<style>body{{font-family:Sora,system-ui,sans-serif;color:#0B1B3F;background:#fff;margin:0;display:grid;place-items:center;min-height:100vh}}'
            f'main{{max-width:420px;padding:24px;border:1px solid #D9E2F7;border-radius:8px}}h1{{font-size:20px}}'
            f'button,a.btn{{background:#1F4FD8;color:#fff;border:0;border-radius:6px;padding:12px 18px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}}'
            f'button.alt{{background:#fff;color:#1F4FD8;border:1px solid #1F4FD8}}</style></head><body><main>{body}</main></body></html>')


@router.get("/checkout/{token}", response_class=HTMLResponse)
def checkout_page(token: str, db: Session = Depends(get_db)):
    o = _order(db, token)
    ret = f"{settings.api_base_url}/checkout/{token}/return"
    if o.status == "PAID":
        return RedirectResponse(ret, 303)
    if o.status != "PENDING" or (o.expires_at and o.expires_at < utcnow()):
        return HTMLResponse(_page("Checkout expired", "<h1>This checkout has expired</h1><p>Your tickets were released. Go back to the event page to start again.</p>"), 410)
    n = db.query(func.count(Payment.id)).filter(Payment.order_id == o.id).scalar() or 0
    txn = f"{o.reference}-{n + 1}"  # a fresh reference for every checkout attempt
    db.add(Payment(order_id=o.id, txn_ref=txn))
    db.commit()
    gw = get_gateway()
    if gw.name == "simulated":
        body = (f"<h1>Simulated checkout</h1><p>Development mode. No real payment is taken.</p><p>Order {escape(o.reference)}<br>"
                f"Amount: NGN {o.amount_kobo / 100:,.2f}</p><form method='post' action='/checkout/{token}/simulate'>"
                f"<button name='outcome' value='success'>Simulate successful payment</button> "
                f"<button class='alt' name='outcome' value='fail'>Simulate failure</button></form>")
        return HTMLResponse(_page("Simulated checkout", body))
    params = gw.client_params(txn, o.amount_kobo)
    params["site_redirect_url"] = ret
    body = (f"<h1>Opening secure checkout</h1><p>Order {escape(o.reference)}</p><button id='pay'>Pay now</button>"
            f"<script src='{escape(settings.ipg_script_url)}'></script><script>"
            f"var params={json.dumps(params)};var back={json.dumps(ret)};"
            f"params.onComplete=function(){{window.location.href=back;}};"
            f"function pay(){{window.webpayCheckout(params);}}"
            f"document.getElementById('pay').addEventListener('click',pay);pay();</script>")
    return HTMLResponse(_page("Checkout", body))


@router.post("/checkout/{token}/simulate")
def simulate(token: str, outcome: str = Form(...), db: Session = Depends(get_db)):
    if settings.gateway != "simulated":
        raise HTTPException(404)
    o = _order(db, token)
    p = db.query(Payment).filter(Payment.order_id == o.id).order_by(Payment.id.desc()).first()
    if p:
        get_gateway().mark(p.txn_ref, outcome == "success")
    return RedirectResponse(f"/checkout/{token}/return", 303)


@router.api_route("/checkout/{token}/return", methods=["GET", "POST"])
def checkout_return(token: str, db: Session = Depends(get_db)):
    o = _order(db, token)
    ok = core.verify_order(db, o)
    db.commit()
    suffix = "" if ok else "?status=pending"
    base = f"{settings.app_scheme}://ticket/{token}" if o.client == "mobile" else f"{settings.web_base_url}/tickets/{token}"
    return RedirectResponse(base + suffix, 303)


@router.post("/api/tickets/{ticket_id}/cancel")
def cancel_ticket(ticket_id: int, x_order_token: str = Header(...), db: Session = Depends(get_db)):
    o = _order(db, x_order_token)
    t = db.get(Ticket, ticket_id)
    if not t or t.order_id != o.id:
        raise HTTPException(404, "Ticket not found")
    if t.status != "VALID":
        raise HTTPException(400, "This ticket is already cancelled")
    e = db.get(Event, o.event_id)
    ok, reason = core.can_cancel(o, e)
    if not ok:
        raise HTTPException(403, reason)
    core.create_refund(db, t, o, "ATTENDEE_CANCELLED")
    db.commit()
    return order_view(db, o, x_order_token)


@router.get("/api/tickets/{ticket_id}/qr.png")
def ticket_qr(ticket_id: int, token: str, db: Session = Depends(get_db)):
    o = _order(db, token)
    t = db.get(Ticket, ticket_id)
    if not t or t.order_id != o.id or t.status != "VALID" or t.attendance_mode != "PHYSICAL":
        raise HTTPException(404)
    return Response(qr_png(ticket_qr_token(t.id)), media_type="image/png")


class LookupIn(BaseModel):
    email: EmailStr


@router.post("/api/tickets/lookup")
def lookup(body: LookupIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.query(Order.id).filter(Order.email == email, Order.status == "PAID").first():
        core.queue_notification(db, "TICKET_LOOKUP", email, "email", 0, dedupe=f"lookup:{email}:{utcnow():%Y%m%d%H}")
        db.commit()
    return {"ok": True}


@router.get("/join/{join_token}")
def join(join_token: str, db: Session = Depends(get_db)):
    t = db.query(Ticket).filter(Ticket.join_token == join_token).first()
    if not t or t.status != "VALID":
        raise HTTPException(404, "This join link is not valid")
    o = db.get(Order, t.order_id)
    e = db.get(Event, o.event_id)
    if e.status in ("CANCELLED", "DRAFT") or not e.online_url:
        raise HTTPException(410, "This event is not available")
    try:
        db.add(CheckIn(ticket_id=t.id, method="ONLINE_JOIN"))
        db.flush()
        emit(db, f"event:{e.id}", "checkin.recorded", {"ticket_id": t.id, "method": "ONLINE_JOIN"})
        db.commit()
    except IntegrityError:
        db.rollback()
    return RedirectResponse(e.online_url, 302)


@router.get("/sitemap.xml")
def sitemap(db: Session = Depends(get_db)):
    urls = [f"{settings.web_base_url}{p}" for p in ("/", "/terms", "/privacy", "/find-tickets")]
    for e in db.query(Event).filter(Event.status.in_(["PUBLISHED", "LOCKED"]), Event.visibility == "PUBLIC"):
        urls.append(f"{settings.web_base_url}{canonical(e)}")
    body = "".join(f"<url><loc>{escape(u)}</loc></url>" for u in urls)
    return Response(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>',
                    media_type="application/xml")


@router.get("/robots.txt")
def robots():
    return Response(f"User-agent: *\nAllow: /\nSitemap: {settings.api_base_url}/sitemap.xml\n", media_type="text/plain")


@router.get("/health")
def health():
    return {"status": "ok"}
