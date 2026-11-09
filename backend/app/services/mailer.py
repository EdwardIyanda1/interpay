import io
import smtplib
import time
from datetime import timedelta, timezone
from email.message import EmailMessage
from zoneinfo import ZoneInfo

import qrcode

from ..config import settings
from ..models import Event, Order, Ticket, TicketType
from ..security import make_token
from ..util import naira

BLUE = "#1F4FD8"


def fmt_dt(dt, tz):
    return dt.replace(tzinfo=timezone.utc).astimezone(ZoneInfo(tz)).strftime("%A %d %B %Y, %I:%M %p") + f" ({tz})"


def order_token(order_id: int) -> str:
    return make_token("order", {"oid": order_id})


def qr_png(data: str) -> bytes:
    buf = io.BytesIO()
    qrcode.make(data).save(buf, format="PNG")
    return buf.getvalue()


def ticket_qr_token(ticket_id: int) -> str:
    return make_token("qr", {"t": ticket_id})


def policy_text(order: Order, event: Event) -> str:
    if order.cancellation_allowed:
        deadline = event.start_at - timedelta(hours=settings.cancel_window_hours)
        return f"You can cancel for a refund until {fmt_dt(deadline, event.timezone)}. After that, tickets are locked."
    return "This event does not allow cancellations. Tickets are non-refundable unless the organiser cancels or materially changes the event."


def wrap(title: str, body: str) -> str:
    return (
        f'<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#0B1B3F">'
        f'<div style="background:{BLUE};color:#fff;padding:16px 20px;font-size:20px;font-weight:700">InterPay</div>'
        f'<div style="padding:20px;border:1px solid #D9E2F7;border-top:0"><h1 style="font-size:20px;margin:0 0 12px">{title}</h1>{body}'
        f'<p style="color:#5B6B8C;font-size:12px;margin-top:24px">InterPay is a hackathon project built on the Interswitch Payment Gateway.</p></div></div>'
    )


def build_message(db, n) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = settings.mail_from
    msg["To"] = n.recipient
    images: list[tuple[str, bytes]] = []
    ics = None
    if n.type == "TICKET_LOOKUP":
        orders = db.query(Order).filter(Order.email == n.recipient, Order.status == "PAID").order_by(Order.id.desc()).limit(10).all()
        rows = ""
        text = "Your tickets:\n"
        for o in orders:
            e = db.get(Event, o.event_id)
            link = f"{settings.web_base_url}/tickets/{order_token(o.id)}"
            rows += f'<p><a href="{link}">{e.title}</a> (order {o.reference})</p>'
            text += f"- {e.title} ({o.reference}): {link}\n"
        msg["Subject"] = "Your InterPay tickets"
        html = wrap("Your tickets", rows or "<p>No tickets were found for this email address.</p>")
    elif n.type == "EVENT_CANCELLED":
        o = db.get(Order, n.ref_id)
        e = db.get(Event, o.event_id)
        msg["Subject"] = f"Cancelled: {e.title}"
        text = f"{e.title} was cancelled by the organiser. Your tickets are refunded in full to your original payment method."
        html = wrap("Event cancelled", f"<p>{text}</p><p>Order reference: {o.reference}</p>")
    elif n.type == "EVENT_UPDATED":
        o = db.get(Order, n.ref_id)
        e = db.get(Event, o.event_id)
        link = f"{settings.web_base_url}/tickets/{order_token(o.id)}"
        msg["Subject"] = f"Updated: {e.title}"
        text = f"The organiser changed the details of {e.title}. New start: {fmt_dt(e.start_at, e.timezone)}. You can review your ticket and cancel for a refund here: {link}"
        html = wrap("Event updated", f'<p>The organiser changed the details of <b>{e.title}</b>.</p><p>New start: {fmt_dt(e.start_at, e.timezone)}</p><p><a href="{link}">Review your ticket or cancel for a refund</a></p>')
    elif n.type == "REFUND":
        from ..models import Refund
        r = db.get(Refund, n.ref_id)
        o = db.get(Order, r.order_id)
        e = db.get(Event, o.event_id)
        msg["Subject"] = f"Refund processed: {e.title}"
        text = f"Your refund of {naira(r.amount_kobo)} for {e.title} has been processed."
        html = wrap("Refund processed", f"<p>{text}</p><p>Order reference: {o.reference}</p>")
    else:  # CONFIRMATION and REMINDER
        o = db.get(Order, n.ref_id)
        e = db.get(Event, o.event_id)
        tickets = db.query(Ticket).filter(Ticket.order_id == o.id, Ticket.status == "VALID").order_by(Ticket.id).all()
        link = f"{settings.web_base_url}/tickets/{order_token(o.id)}"
        reminder = n.type == "REMINDER"
        msg["Subject"] = (f"Reminder: {e.title} starts soon" if reminder else f"Your tickets for {e.title}")
        where = ""
        if o.attendance_mode == "ONLINE":
            where = f"Online ({e.online_platform or 'link below'})"
        else:
            where = ", ".join(x for x in [e.venue_name, e.venue_address] if x) or "Venue to be announced"
        lines, trows = [], ""
        for i, t in enumerate(tickets, 1):
            cat = db.get(TicketType, t.ticket_type_id).name
            who = f" for {t.guest_name}" if t.guest_name else ""
            lines.append(f"Ticket {i}: {cat}{who}")
            if t.attendance_mode == "PHYSICAL":
                images.append((f"qr{t.id}", qr_png(ticket_qr_token(t.id))))
                trows += f'<p><b>{cat}</b>{who}<br><img src="cid:qr{t.id}" width="160" height="160" alt="Ticket QR code"></p>'
            else:
                j = f"{settings.api_base_url}/join/{t.join_token}"
                lines.append(f"  Join link: {j}")
                trows += f'<p><b>{cat}</b>{who}<br><a href="{j}">Personal join link</a></p>'
        contact = ", ".join(x for x in [e.contact_name, e.contact_email, e.contact_phone] if x)
        text = (
            f"{'Reminder: ' if reminder else 'Thank you. Your tickets are confirmed.'}\n\n"
            f"Event: {e.title}\nWhen: {fmt_dt(e.start_at, e.timezone)}\nWhere: {where}\n"
            f"Order reference: {o.reference}\nAmount paid: {naira(o.amount_kobo)}\n\n" + "\n".join(lines) +
            f"\n\nTicket page: {link}\n\n{policy_text(o, e)}\n" + (f"Organiser contact: {contact}\n" if contact else "")
        )
        html = wrap(
            "Reminder" if reminder else "Your tickets are confirmed",
            f"<p><b>{e.title}</b><br>{fmt_dt(e.start_at, e.timezone)}<br>{where}</p>{trows}"
            f"<p>Order reference: <b>{o.reference}</b><br>Amount paid: {naira(o.amount_kobo)}</p>"
            f'<p><a href="{link}" style="color:{BLUE}">Open your ticket page</a></p><p>{policy_text(o, e)}</p>'
            + (f"<p>Organiser contact: {contact}</p>" if contact else ""),
        )
        s, en = e.start_at, e.end_at
        ics = (
            "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//InterPay//EN\r\nBEGIN:VEVENT\r\n"
            f"UID:{e.id}-{o.id}@interpay\r\nDTSTAMP:{s:%Y%m%dT%H%M%S}Z\r\nDTSTART:{s:%Y%m%dT%H%M%S}Z\r\nDTEND:{en:%Y%m%dT%H%M%S}Z\r\n"
            f"SUMMARY:{e.title}\r\nLOCATION:{where}\r\nDESCRIPTION:{link}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"
        ).encode()
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    body = msg.get_body(("html",))
    for cid, png in images:
        body.add_related(png, "image", "png", cid=f"<{cid}>")
    if ics:
        msg.add_attachment(ics, maintype="text", subtype="calendar", filename="event.ics")
    return msg


def send(msg: EmailMessage, key: str):
    if settings.mail_mode == "smtp":
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as s:
            s.starttls()
            if settings.smtp_user:
                s.login(settings.smtp_user, settings.smtp_password)
            s.send_message(msg)
    else:
        settings.mail_dir.mkdir(parents=True, exist_ok=True)
        safe = key.replace(":", "_")
        (settings.mail_dir / f"{int(time.time()*1000)}-{safe}.eml").write_bytes(bytes(msg))
