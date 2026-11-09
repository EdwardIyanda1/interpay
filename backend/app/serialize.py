from .config import settings
from .models import Event, Order, Ticket, TicketType
from .services.core import available, can_cancel, cancel_deadline
from .services.mailer import ticket_qr_token
from .util import iso, utcnow


def media_url(m) -> str:
    return f"{settings.api_base_url}/uploads/{m.path}"


def canonical(e: Event) -> str:
    return f"/event/{e.slug}/{e.year}"


def event_public(db, e: Event, owner: bool = False) -> dict:
    now = utcnow()
    cats = []
    for t in e.categories:
        if t.is_hidden and not owner:
            continue
        left = available(db, t)
        state = "AVAILABLE"
        if t.sales_start and now < t.sales_start:
            state = "NOT_STARTED"
        elif t.sales_end and now > t.sales_end:
            state = "ENDED"
        elif left <= 0:
            state = "SOLD_OUT"
        cats.append({"id": t.id, "name": t.name, "description": t.description, "price_kobo": t.price_kobo,
                     "quantity": t.quantity, "available": left, "max_per_order": t.max_per_order, "state": state,
                     "allowed_modes": t.allowed_modes.split(","), "is_hidden": t.is_hidden, "sort_order": t.sort_order,
                     "sales_start": iso(t.sales_start), "sales_end": iso(t.sales_end)})
    d = {
        "id": e.id, "slug": e.slug, "year": e.year, "canonical_path": canonical(e), "title": e.title,
        "description": e.description, "category": e.category, "start_at": iso(e.start_at), "end_at": iso(e.end_at),
        "timezone": e.timezone, "status": e.status, "attendance_mode": e.attendance_mode,
        "cancellation_allowed": e.cancellation_allowed, "cancel_window_hours": settings.cancel_window_hours,
        "venue_name": e.venue_name, "venue_address": e.venue_address, "map_url": e.map_url,
        "online_platform": e.online_platform, "physical_capacity": e.physical_capacity, "online_capacity": e.online_capacity,
        "contact": {"name": e.contact_name, "email": e.contact_email, "phone": e.contact_phone, "whatsapp": e.contact_whatsapp},
        "visibility": e.visibility, "min_checkins": e.min_checkins,
        "sales_open": e.status in ("PUBLISHED", "LOCKED") and now < e.start_at,
        "media": [{"id": m.id, "kind": m.kind, "url": media_url(m), "content_type": m.content_type} for m in e.media],
        "categories": cats,
    }
    if owner:
        d["online_url"] = e.online_url
    return d


def event_card(e: Event) -> dict:
    prices = [t.price_kobo for t in e.categories if not t.is_hidden]
    cover = next((m for m in e.media if m.kind in ("COVER", "FLYER") and m.content_type.startswith("image/")), None)
    return {"id": e.id, "title": e.title, "slug": e.slug, "year": e.year, "canonical_path": canonical(e),
            "start_at": iso(e.start_at), "timezone": e.timezone, "attendance_mode": e.attendance_mode,
            "venue_name": e.venue_name, "category": e.category, "from_price_kobo": min(prices) if prices else None,
            "image": media_url(cover) if cover else None}


def order_view(db, o: Order, token: str) -> dict:
    e = db.get(Event, o.event_id)
    ok, reason = can_cancel(o, e)
    paid = o.status == "PAID"
    d = {
        "id": o.id, "token": token, "reference": o.reference, "status": o.status, "amount_kobo": o.amount_kobo,
        "first_name": o.first_name, "last_name": o.last_name, "email": o.email, "phone": o.phone,
        "attendance_mode": o.attendance_mode, "expires_at": iso(o.expires_at),
        "event": {"id": e.id, "title": e.title, "slug": e.slug, "year": e.year, "canonical_path": canonical(e),
                  "start_at": iso(e.start_at), "end_at": iso(e.end_at), "timezone": e.timezone, "status": e.status,
                  "venue_name": e.venue_name, "venue_address": e.venue_address, "map_url": e.map_url,
                  "online_platform": e.online_platform if paid else None,
                  "contact": {"name": e.contact_name, "email": e.contact_email, "phone": e.contact_phone, "whatsapp": e.contact_whatsapp}},
        "policy": {"cancellation_allowed": o.cancellation_allowed or e.materially_changed,
                   "deadline": iso(cancel_deadline(e)), "can_cancel": ok, "reason": reason},
        "tickets": [],
    }
    if paid:
        from .models import CheckIn
        checked = {tid for (tid,) in db.query(CheckIn.ticket_id)}
        for t in db.query(Ticket).filter(Ticket.order_id == o.id).order_by(Ticket.id):
            cat = db.get(TicketType, t.ticket_type_id)
            valid = t.status == "VALID"
            d["tickets"].append({
                "id": t.id, "category": cat.name, "status": t.status, "attendance_mode": t.attendance_mode,
                "guest_name": t.guest_name, "checked_in": t.id in checked,
                "qr_token": ticket_qr_token(t.id) if valid and t.attendance_mode == "PHYSICAL" else None,
                "qr_url": f"{settings.api_base_url}/api/tickets/{t.id}/qr.png?token={token}" if valid and t.attendance_mode == "PHYSICAL" else None,
                "join_url": f"{settings.api_base_url}/join/{t.join_token}" if valid and t.join_token else None,
            })
    return d
