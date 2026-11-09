"""Create demo data: python -m app.seed"""
from datetime import timedelta

from .db import Base, SessionLocal, engine
from .main import ensure_admin
from .models import Event, PayoutAccount, TicketType, User
from .routers.organiser import unique_slug
from .security import hash_password
from .util import utcnow, year_of


def run():
    Base.metadata.create_all(engine)
    ensure_admin()
    with SessionLocal() as db:
        org = db.query(User).filter(User.email == "organiser@interpay.app").first()
        if not org:
            org = User(email="organiser@interpay.app", name="Demo Organiser", role="organiser", approved=True,
                       password_hash=hash_password("demo-password-1"))
            db.add(org)
            db.flush()
            db.add(PayoutAccount(organiser_id=org.id, bank_code="058", account_number="0123456789",
                                 account_name="Demo Organiser", verified=True))
        start = utcnow() + timedelta(days=3)
        year = year_of(start, "Africa/Lagos")
        if not db.query(Event).filter(Event.title == "Lead City Tech Week").first():
            e = Event(organiser_id=org.id, title="Lead City Tech Week", slug=unique_slug(db, "lead-city-tech-week", year), year=year,
                      description="Three days of talks, workshops and demos for students and builders in Ibadan.",
                      category="tech", start_at=start, end_at=start + timedelta(days=3), attendance_mode="BOTH",
                      cancellation_allowed=True, venue_name="Lead City University", venue_address="Ibadan, Oyo State, Nigeria",
                      online_platform="Google Meet", online_url="https://meet.google.com/", contact_name="Event desk",
                      contact_email="events@interpay.app", status="PUBLISHED", min_checkins=1)
            db.add(e)
            db.flush()
            db.add_all([
                TicketType(event_id=e.id, name="Regular", description="Entry to all sessions", price_kobo=100000, quantity=200, sort_order=1),
                TicketType(event_id=e.id, name="VIP", description="Front seating and lunch", price_kobo=500000, quantity=40, sort_order=2, allowed_modes="PHYSICAL"),
                TicketType(event_id=e.id, name="Online pass", description="Live stream access", price_kobo=50000, quantity=500, sort_order=3, allowed_modes="ONLINE"),
                TicketType(event_id=e.id, name="Free community pass", description="Limited free seats", price_kobo=0, quantity=20, sort_order=4),
            ])
        db.commit()
    print("Seeded. Admin:", __import__("app.config", fromlist=["settings"]).settings.admin_email, "| Organiser: organiser@interpay.app / demo-password-1")


if __name__ == "__main__":
    run()
