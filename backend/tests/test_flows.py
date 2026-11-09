import itertools
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app import worker
from app.db import SessionLocal
from app.main import app
from app.models import Event, LedgerEntry, Notification, Payout, Refund
from app.config import settings

counter = itertools.count(1)


def z(delta: timedelta) -> str:
    return (datetime.now(timezone.utc) + delta).strftime("%Y-%m-%dT%H:%M:%SZ")


@pytest.fixture(scope="module")
def c():
    with TestClient(app) as client:
        yield client


def hdr(c, email, pw):
    r = c.post("/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def make_event(c, verified=True, mode="BOTH", cancellation=True, start=timedelta(days=3), title="Test Fest", prices=(100000, 50000)):
    n = next(counter)
    admin = hdr(c, "admin@interpay.app", "admin-pass-123")
    r = c.post("/api/auth/register", json={"email": f"org{n}@example.com", "password": "password-123", "name": "Org"})
    org = {"Authorization": f"Bearer {r.json()['token']}"}
    uid = r.json()["user"]["id"]
    if verified:
        c.post(f"/api/admin/organisers/{uid}/approve", headers=admin)
        c.put("/api/organiser/payout-account", headers=org, json={"bank_code": "058", "account_number": "0123456789", "account_name": "Org"})
        c.post(f"/api/admin/organisers/{uid}/verify-payout-account", headers=admin)
    body = {"title": title, "start_at": z(start), "end_at": z(start + timedelta(hours=4)), "attendance_mode": mode,
            "cancellation_allowed": cancellation, "venue_name": "Hall", "venue_address": "Ibadan",
            "online_platform": "Meet", "online_url": "https://meet.example.org/x", "contact_email": "help@example.com"}
    e = c.post("/api/organiser/events", headers=org, json=body).json()
    cats = []
    for i, p in enumerate(prices):
        e = c.post(f"/api/organiser/events/{e['id']}/categories", headers=org,
                   json={"name": f"Cat{i}", "price_kobo": p, "quantity": 5, "allowed_modes": "PHYSICAL,ONLINE"}).json()
    r = c.post(f"/api/organiser/events/{e['id']}/publish", headers=org)
    assert r.status_code == 200, r.text
    return r.json(), org, admin


def buy(c, e, qty=2, cat=0, mode="PHYSICAL", pay=True, email="buyer@example.com"):
    r = c.post("/api/orders", json={"event_id": e["id"], "items": [{"ticket_type_id": e["categories"][cat]["id"], "quantity": qty}],
                                    "first_name": "Ada", "last_name": "Obi", "email": email, "phone": "08031234567",
                                    "attendance_mode": mode, "accepted_policy": True})
    assert r.status_code == 200, r.text
    o = r.json()
    if pay and o["checkout_url"]:
        tok = o["order_token"]
        assert c.get(f"/checkout/{tok}").status_code == 200
        r = c.post(f"/checkout/{tok}/simulate", data={"outcome": "success"}, follow_redirects=False)
        assert r.status_code == 303
        r = c.get(f"/checkout/{tok}/return", follow_redirects=False)
        assert r.status_code == 303 and "/tickets/" in r.headers["location"]
    return o


def order(c, o):
    return c.get(f"/api/orders/{o['order_token']}").json()


def test_purchase_confirmation_email_and_ledger(c):
    e, org, _ = make_event(c)
    o = buy(c, e, qty=2)
    v = order(c, o)
    assert v["status"] == "PAID" and len(v["tickets"]) == 2 and v["tickets"][0]["qr_url"]
    assert v["phone"] == "+2348031234567"
    worker.tick()
    with SessionLocal() as db:
        n = db.query(Notification).filter(Notification.dedupe_key == f"confirm:{o['order_id']}").one()
        assert n.status == "SENT"
    mails = list(settings.mail_dir.glob("*confirm*"))
    assert mails and b"Your tickets are confirmed" in mails[-1].read_bytes()
    stats = c.get(f"/api/organiser/events/{e['id']}", headers=org).json()["stats"]
    assert stats["held_kobo"] == 200000 and stats["tickets_sold"] == 2


def test_validation_and_stock(c):
    e, _, _ = make_event(c)
    cat = e["categories"][0]["id"]
    base = {"event_id": e["id"], "items": [{"ticket_type_id": cat, "quantity": 6}], "first_name": "A", "last_name": "B",
            "email": "a@example.com", "phone": "08031234567", "attendance_mode": "PHYSICAL", "accepted_policy": True}
    assert c.post("/api/orders", json=base).status_code == 400  # more than max per order or stock
    assert c.post("/api/orders", json={**base, "items": [{"ticket_type_id": cat, "quantity": 1}], "phone": "123"}).status_code == 422
    assert c.post("/api/orders", json={**base, "items": [{"ticket_type_id": cat, "quantity": 1}], "accepted_policy": False}).status_code == 400
    assert c.post("/api/orders", json={**base, "items": [{"ticket_type_id": cat, "quantity": 1}], "attendance_mode": None}).status_code == 400
    # reservation holds stock for unpaid orders
    buy(c, e, qty=5, pay=False)
    r = c.post("/api/orders", json={**base, "items": [{"ticket_type_id": cat, "quantity": 1}]})
    assert r.status_code == 400 and "left" in r.json()["detail"]


def test_cancel_allowed_refund_and_stock_release(c):
    e, org, _ = make_event(c)
    o = buy(c, e, qty=2)
    v = order(c, o)
    assert v["policy"]["can_cancel"]
    r = c.post(f"/api/tickets/{v['tickets'][0]['id']}/cancel", headers={"X-Order-Token": o["order_token"]})
    assert r.status_code == 200
    worker.tick()
    with SessionLocal() as db:
        ref = db.query(Refund).filter(Refund.order_id == o["order_id"]).one()
        assert ref.status == "PAID" and ref.amount_kobo == 100000
    assert c.get(f"/api/organiser/events/{e['id']}", headers=org).json()["stats"]["held_kobo"] == 100000
    assert c.get(f"/api/events/{e['slug']}/{e['year']}").json()["categories"][0]["available"] == 4


def test_cancel_not_allowed_and_after_deadline(c):
    e, _, _ = make_event(c, cancellation=False)
    o = buy(c, e)
    t = order(c, o)["tickets"][0]["id"]
    r = c.post(f"/api/tickets/{t}/cancel", headers={"X-Order-Token": o["order_token"]})
    assert r.status_code == 403 and "does not allow" in r.json()["detail"]
    e2, _, _ = make_event(c, start=timedelta(hours=6))  # inside the 12 hour window
    o2 = buy(c, e2)
    t2 = order(c, o2)["tickets"][0]["id"]
    r = c.post(f"/api/tickets/{t2}/cancel", headers={"X-Order-Token": o2["order_token"]})
    assert r.status_code == 403 and "closed" in r.json()["detail"]


def test_event_cancelled_by_organiser_refunds_everyone(c):
    e, org, _ = make_event(c)
    o = buy(c, e, qty=2)
    assert c.post(f"/api/organiser/events/{e['id']}/cancel", headers=org).status_code == 200
    worker.tick()
    with SessionLocal() as db:
        assert all(r.status == "PAID" for r in db.query(Refund).filter(Refund.order_id == o["order_id"]))
        assert db.query(LedgerEntry).filter(LedgerEntry.event_id == e["id"]).with_entities(LedgerEntry.amount_kobo).all()
    assert c.get(f"/api/organiser/events/{e['id']}", headers=org).json()["stats"]["held_kobo"] == 0


def _finish_event(event_id):
    with SessionLocal() as db:
        e = db.get(Event, event_id)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        e.start_at, e.end_at, e.status = now - timedelta(hours=3), now - timedelta(hours=1), "LOCKED"
        db.commit()


def test_payout_after_event_happens(c):
    e, org, _ = make_event(c)
    o = buy(c, e, qty=2)
    tk = order(c, o)["tickets"][0]
    r = c.post("/api/organiser/checkins", headers=org, json={"qr_token": tk["qr_token"]})
    assert r.json()["result"] == "VALID"
    assert c.post("/api/organiser/checkins", headers=org, json={"qr_token": tk["qr_token"]}).json()["result"] == "ALREADY_USED"
    _finish_event(e["id"])
    worker.tick()
    with SessionLocal() as db:
        p = db.query(Payout).filter(Payout.event_id == e["id"]).one()
        assert p.status == "PAID" and p.fee_kobo == 6000 and p.amount_kobo == 194000
        assert db.get(Event, e["id"]).status == "PAID_OUT"
        assert sum(x.amount_kobo for x in db.query(LedgerEntry).filter(LedgerEntry.event_id == e["id"])) == 0


def test_payout_held_until_organiser_verified_then_released(c):
    e, org, admin = make_event(c, verified=False)
    o = buy(c, e)
    c.post("/api/organiser/checkins", headers=org, json={"qr_token": order(c, o)["tickets"][0]["qr_token"]})
    _finish_event(e["id"])
    worker.tick()
    with SessionLocal() as db:
        p = db.query(Payout).filter(Payout.event_id == e["id"]).one()
        assert p.status == "HELD"
        pid, org_id = p.id, db.get(Event, e["id"]).organiser_id
    c.post(f"/api/admin/organisers/{org_id}/approve", headers=admin)
    c.put("/api/organiser/payout-account", headers=org, json={"bank_code": "058", "account_number": "0123456789", "account_name": "Org"})
    c.post(f"/api/admin/organisers/{org_id}/verify-payout-account", headers=admin)
    assert c.post(f"/api/admin/payouts/{pid}/release", headers=admin).json()["status"] == "PENDING"
    worker.tick()
    with SessionLocal() as db:
        assert db.get(Payout, pid).status == "PAID"


def test_no_checkins_means_needs_review_and_no_payout(c):
    e, _, _ = make_event(c)
    buy(c, e)
    _finish_event(e["id"])
    worker.tick()
    with SessionLocal() as db:
        assert db.get(Event, e["id"]).status == "NEEDS_REVIEW"
        assert db.query(Payout).filter(Payout.event_id == e["id"]).first() is None


def test_event_url_redirect_after_slug_change(c):
    e, org, _ = make_event(c, title="Slug Test Event")
    old = (e["slug"], e["year"])
    r = c.patch(f"/api/organiser/events/{e['id']}", headers=org, json={"slug": "renamed-event"})
    assert r.status_code == 200 and r.json()["canonical_path"].startswith("/event/renamed-event/")
    page = c.get(f"/api/events/{old[0]}/{old[1]}").json()
    assert page["canonical_path"] == r.json()["canonical_path"]
    assert c.get("/api/events/nope/2026").status_code == 404


def test_free_ticket_and_online_join(c):
    e, org, _ = make_event(c, prices=(0, 50000))
    o = buy(c, e, qty=1, cat=0, mode="ONLINE")
    assert o["status"] == "PAID" and o["checkout_url"] is None
    t = order(c, o)["tickets"][0]
    assert t["join_url"] and t["qr_url"] is None
    r = c.get(t["join_url"].replace(settings.api_base_url, ""), follow_redirects=False)
    assert r.status_code == 302
    assert c.get(f"/api/organiser/events/{e['id']}", headers=org).json()["stats"]["checkins"] == 1


def test_realtime_resume_replays_events(c):
    e, org, _ = make_event(c)
    o = buy(c, e)
    t = c.post("/api/ws/ticket", json={"order_token": o["order_token"]}).json()["ticket"]
    with c.websocket_connect(f"/ws?ticket={t}") as ws:
        assert ws.receive_json()["type"] == "hello"
        ws.send_json({"type": "resume", "last_seq": 0})
        types = []
        while True:
            m = ws.receive_json()
            types.append(m["type"])
            if m["type"] == "resumed":
                break
    assert "order.paid" in types


def test_admin_requires_role_and_pages(c):
    e, org, admin = make_event(c)
    assert c.get("/api/admin/stats", headers=org).status_code == 403
    assert c.get("/api/admin/stats", headers=admin).status_code == 200
    assert c.get("/sitemap.xml").status_code == 200
