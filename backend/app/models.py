from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base
from .util import utcnow

S = String


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(S(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(S(120), default="")
    password_hash: Mapped[str] = mapped_column(S(300))
    role: Mapped[str] = mapped_column(S(20), default="organiser")  # organiser | admin
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class PayoutAccount(Base):
    __tablename__ = "payout_accounts"
    id: Mapped[int] = mapped_column(primary_key=True)
    organiser_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    bank_code: Mapped[str] = mapped_column(S(20))
    account_number: Mapped[str] = mapped_column(S(20))
    account_name: Mapped[str] = mapped_column(S(160))
    verified: Mapped[bool] = mapped_column(Boolean, default=False)


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (UniqueConstraint("slug", "year"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    organiser_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    slug: Mapped[str] = mapped_column(S(120), index=True)
    year: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(S(200))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(S(60), default="community")
    start_at: Mapped[datetime] = mapped_column(DateTime)
    end_at: Mapped[datetime] = mapped_column(DateTime)
    timezone: Mapped[str] = mapped_column(S(60), default="Africa/Lagos")
    # DRAFT PUBLISHED LOCKED COMPLETED PAID_OUT CANCELLED NEEDS_REVIEW
    status: Mapped[str] = mapped_column(S(20), default="DRAFT", index=True)
    cancellation_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    materially_changed: Mapped[bool] = mapped_column(Boolean, default=False)
    attendance_mode: Mapped[str] = mapped_column(S(10), default="PHYSICAL")  # PHYSICAL ONLINE BOTH
    venue_name: Mapped[Optional[str]] = mapped_column(S(200), nullable=True)
    venue_address: Mapped[Optional[str]] = mapped_column(S(400), nullable=True)
    map_url: Mapped[Optional[str]] = mapped_column(S(500), nullable=True)
    physical_capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    online_platform: Mapped[Optional[str]] = mapped_column(S(80), nullable=True)
    online_url: Mapped[Optional[str]] = mapped_column(S(500), nullable=True)
    online_capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    contact_name: Mapped[Optional[str]] = mapped_column(S(120), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(S(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(S(40), nullable=True)
    contact_whatsapp: Mapped[Optional[str]] = mapped_column(S(40), nullable=True)
    visibility: Mapped[str] = mapped_column(S(10), default="PUBLIC")
    min_checkins: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    categories: Mapped[list["TicketType"]] = relationship(order_by="TicketType.sort_order", cascade="all, delete-orphan")
    media: Mapped[list["EventMedia"]] = relationship(order_by="EventMedia.sort_order", cascade="all, delete-orphan")


class SlugRedirect(Base):
    __tablename__ = "slug_redirects"
    __table_args__ = (UniqueConstraint("old_slug", "old_year"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"))
    old_slug: Mapped[str] = mapped_column(S(120))
    old_year: Mapped[int] = mapped_column(Integer)


class EventMedia(Base):
    __tablename__ = "event_media"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    kind: Mapped[str] = mapped_column(S(10), default="FLYER")  # FLYER GALLERY COVER
    path: Mapped[str] = mapped_column(S(300))
    content_type: Mapped[str] = mapped_column(S(60), default="image/png")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class TicketType(Base):
    __tablename__ = "ticket_types"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    name: Mapped[str] = mapped_column(S(120))
    description: Mapped[str] = mapped_column(Text, default="")
    price_kobo: Mapped[int] = mapped_column(Integer, default=0)
    quantity: Mapped[int] = mapped_column(Integer)
    max_per_order: Mapped[int] = mapped_column(Integer, default=10)
    allowed_modes: Mapped[str] = mapped_column(S(30), default="PHYSICAL,ONLINE")
    sales_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sales_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    reference: Mapped[str] = mapped_column(S(24), unique=True)
    status: Mapped[str] = mapped_column(S(12), default="PENDING", index=True)  # PENDING PAID EXPIRED
    amount_kobo: Mapped[int] = mapped_column(Integer)
    first_name: Mapped[str] = mapped_column(S(80))
    last_name: Mapped[str] = mapped_column(S(80))
    email: Mapped[str] = mapped_column(S(255), index=True)
    phone: Mapped[str] = mapped_column(S(24))
    attendance_mode: Mapped[str] = mapped_column(S(10), default="PHYSICAL")
    guest_names: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancellation_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    policy_accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    client: Mapped[str] = mapped_column(S(10), default="web")
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    items: Mapped[list["OrderItem"]] = relationship(cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    ticket_type_id: Mapped[int] = mapped_column(ForeignKey("ticket_types.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price_kobo: Mapped[int] = mapped_column(Integer)


class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    txn_ref: Mapped[str] = mapped_column(S(60), unique=True)
    status: Mapped[str] = mapped_column(S(12), default="PENDING")  # PENDING SUCCESS
    verified_amount_kobo: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    raw: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Ticket(Base):
    __tablename__ = "tickets"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    ticket_type_id: Mapped[int] = mapped_column(ForeignKey("ticket_types.id"), index=True)
    status: Mapped[str] = mapped_column(S(12), default="VALID")  # VALID CANCELLED
    attendance_mode: Mapped[str] = mapped_column(S(10), default="PHYSICAL")
    guest_name: Mapped[Optional[str]] = mapped_column(S(160), nullable=True)
    join_token: Mapped[Optional[str]] = mapped_column(S(40), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CheckIn(Base):
    __tablename__ = "check_ins"
    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), unique=True)
    method: Mapped[str] = mapped_column(S(12))  # QR_SCAN ONLINE_JOIN
    scanner_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Refund(Base):
    __tablename__ = "refunds"
    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), unique=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    amount_kobo: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(S(12), default="PENDING")  # PENDING PAID FAILED
    reason: Mapped[str] = mapped_column(S(30), default="ATTENDEE_CANCELLED")
    provider_ref: Mapped[Optional[str]] = mapped_column(S(80), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    idempotency_key: Mapped[str] = mapped_column(S(60), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Payout(Base):
    __tablename__ = "payouts"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), unique=True)
    gross_kobo: Mapped[int] = mapped_column(Integer)
    fee_kobo: Mapped[int] = mapped_column(Integer)
    amount_kobo: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(S(12), default="PENDING")  # PENDING HELD PAID FAILED
    hold_reason: Mapped[Optional[str]] = mapped_column(S(200), nullable=True)
    provider_ref: Mapped[Optional[str]] = mapped_column(S(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    type: Mapped[str] = mapped_column(S(24))  # TICKET_SALE REFUND PLATFORM_FEE ORGANISER_PAYOUT
    amount_kobo: Mapped[int] = mapped_column(Integer)  # signed
    ref_type: Mapped[str] = mapped_column(S(20))
    ref_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(S(24))
    channel: Mapped[str] = mapped_column(S(10), default="email")
    recipient: Mapped[str] = mapped_column(S(255))
    ref_type: Mapped[str] = mapped_column(S(20))
    ref_id: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(S(12), default="PENDING", index=True)  # PENDING SENT FAILED
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dedupe_key: Mapped[str] = mapped_column(S(120), unique=True)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Outbox(Base):
    __tablename__ = "event_outbox"
    seq: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    topic: Mapped[str] = mapped_column(S(60), index=True)
    type: Mapped[str] = mapped_column(S(40))
    data: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    actor: Mapped[str] = mapped_column(S(120))
    action: Mapped[str] = mapped_column(S(60))
    entity: Mapped[str] = mapped_column(S(60))
    detail: Mapped[str] = mapped_column(Text, default="")
    at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
