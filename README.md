# InterPay

Event registration with escrow style payouts, built for the Interswitch Discovery Series hackathon at Lead City University.

- Attendees buy tickets through the Interswitch Payment Gateway web checkout.
- The event creator decides whether attendees can cancel. If yes, they can cancel for a refund until 12 hours before the event.
- The creator decides whether people attend in person, online, or both.
- The organiser is paid out after the event happens. If the organiser cancels the event, everyone is refunded.
- A confirmation email with QR codes is sent after every purchase.
- Each event has a public page at `/event/{slug}/{year}`, for example `/event/lead-city-tech-week/2026`.
- Web, mobile and admin all update live over one WebSocket connection, with no polling.

InterPay is a hackathon project built on the Interswitch Payment Gateway. It is not an official Interswitch product.

## What is in the zip

```
backend/            FastAPI, SQLAlchemy, WebSocket layer, background worker, tests
web/                Vite + React + TypeScript (attendee site, organiser dashboard, admin screen)
mobile/             Expo SDK 57 + React Native + expo-router (tickets, QR, door scanner)
packages/shared/    Realtime client, formatting helpers and types used by web and mobile
docs/Architecture.md  The full design document
docker-compose.yml  Backend plus PostgreSQL
```

## Quick start

### 1. Backend (Python 3.11 or newer)

macOS or Linux:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Then open `backend/.env` and set `SECRET_KEY` and `ADMIN_PASSWORD` (the backend reads this file automatically). Generate a key with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.

```bash
python -m app.seed              # optional demo organiser and event
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs. Run the tests with `PYTHONPATH=. pytest -q tests`.

Demo accounts after seeding: admin `admin@interpay.app` with your `ADMIN_PASSWORD`; organiser `organiser@interpay.app` / `demo-password-1`.

### 2. Web

```bash
cd web
npm install
cp .env.example .env            # VITE_API_URL=http://localhost:8000
npm run dev                     # http://localhost:5173
```

The seeded event is at `/event/lead-city-tech-week/2026` (the year follows the start date).

### 3. Mobile (Expo SDK 57)

```bash
cd mobile
npm install
npx expo install --fix          # aligns every package to the SDK 57 versions
cp .env.example .env            # use your computer's LAN address for EXPO_PUBLIC_API_URL
npx expo start
```

The package versions in `mobile/package.json` are placeholders that `expo install --fix` replaces. Use a development build if the store version of Expo Go does not support SDK 57 yet. For the in-app payment return to work, run a development build or standalone build, because the return link uses the `interpay://` scheme. Also set `API_BASE_URL` in the backend `.env` to an address your phone can reach.

## Payments

`PAYMENT_GATEWAY=simulated` (default) shows a clearly labelled simulated checkout, so you can build and demo without credentials. No money moves.

`PAYMENT_GATEWAY=interswitch` serves a hosted checkout page that loads the Interswitch inline checkout script and calls `webpayCheckout` with your merchant code and pay item id (set `IPG_MERCHANT_CODE` and `IPG_PAY_ITEM_ID` from the credentials the organisers gave your team). Web and mobile both use this page. Amounts are sent in kobo. Every checkout attempt gets a fresh transaction reference.

The server never trusts the browser. After checkout it verifies the transaction itself in `backend/app/services/gateway.py`. That verify call uses the Interswitch transaction lookup endpoint (`IPG_VERIFY_URL`). Confirm the exact parameters and any hash header in the Interswitch documentation, because the guide you were given only covers the checkout.

## Payouts and refunds

Refunds and organiser payouts go through `PayoutProvider` in `backend/app/services/payouts.py`. Only the simulated provider is implemented, because the documents you were given cover collection only. Ask your Interswitch contact whether a transfer or disbursement API is available to teams, then implement `InterswitchPayouts`. Until then, say clearly in the demo that payouts and refunds are simulated. The admin Overview shows this too.

## Rules implemented

- Cancellation toggle per event, saved as a policy snapshot on every order. 12 hour cutoff (`CANCEL_WINDOW_HOURS`).
- If the organiser materially changes the start time, attendance mode or venue after sales, buyers are emailed and may cancel for a refund even if cancellation was off. Confirm this rule with your team.
- "Event happens" means the end time passed and at least `min_checkins` check-ins (QR scan or online join) exist. Otherwise the event goes to `NEEDS_REVIEW` for an admin.
- Payout = held funds minus `PLATFORM_FEE_PERCENT`. It is held until the organiser is approved and the payout account is verified by an admin.
- Stock is reserved for 15 minutes during checkout and cannot oversell. Free categories skip checkout.
- Confirmation emails retry with backoff, are deduplicated, and failures show on the admin Emails tab.

## Email

`MAIL_MODE=console` writes each email as an `.eml` file in `MAIL_DIR` so you can open it without a provider. For real delivery set `MAIL_MODE=smtp` plus the SMTP settings, send from a domain with SPF, DKIM and DMARC configured, and test with real inboxes before demo day.

## Differences from docs/Architecture.md

- The background worker runs inside the API process. Swap in Celery or ARQ for production.
- Real-time fan-out is in process. For more than one API instance, add Redis pub/sub behind `realtime.emit`. The outbox table and resume logic already support it.
- Pending orders act as the stock reservation, so there is no separate reservations table.
- Tables are created with `create_all`. Add Alembic migrations before production.
- The web and mobile apps use a small hand written API layer instead of a generated client.
- Not built yet: promo codes, waitlist, ticket transfer, team roles beyond organiser, analytics charts.

## Before you go live

Set a strong `SECRET_KEY` and `ADMIN_PASSWORD`, serve the backend over HTTPS, host it on a long running server (not short lived serverless functions) so WebSockets work, serve `/sitemap.xml` and `/robots.txt` from your public domain, and have the Terms and Privacy pages reviewed.
