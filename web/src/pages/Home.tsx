import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EventCard, formatDateTime, naira } from "@shared";
import { api } from "../api";
import { usePageMeta } from "../meta";
import { Badge, BrandLogo, CategoryArt, MODE_LABEL } from "../ui";

export default function Home() {
  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("ALL");

  usePageMeta({
    title: "Event tickets with protected payments",
    description: "Buy event tickets with payments held until the event happens, and refunds when the organiser allows cancellation.",
    path: "/",
    jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: "InterPay", url: location.origin },
  });

  useEffect(() => {
    api<EventCard[]>("/api/events", { auth: false })
      .then(setEvents)
      .catch((e) => setError(e.message));
  }, []);

  const filteredEvents = useMemo(() => {
    if (!events) return null;
    return events.filter((e) => {
      const matchesMode = modeFilter === "ALL" || e.attendance_mode === modeFilter;
      const q = search.trim().toLowerCase();
      const matchesQuery =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.venue_name ?? "online").toLowerCase().includes(q);
      return matchesMode && matchesQuery;
    });
  }, [events, search, modeFilter]);

  return (
    <main>
      {/* HERO SECTION */}
      <section className="hero-split">
        <div className="hero-copy">
          <div className="eyebrow-pill">
            <img src="/favicon.svg" alt="" width={18} height={18} />
            <span>Protected Event Ticketing on Interswitch IPG</span>
          </div>
          <h1>Buy event tickets. Your money is held until the event happens.</h1>
          <p className="hero-lead">
            InterPay collects ticket payments through the Interswitch Payment Gateway and releases the funds to the organiser only after the event takes place. If the organiser allows cancellation, you can cancel up to 12 hours before the start for a refund.
          </p>
          <div className="actions" style={{ marginTop: 8 }}>
            <a className="btn" href="#events">Browse upcoming events</a>
            <Link className="btn ghost" to="/login">Create an event</Link>
          </div>

          <ul className="trust-Strip" aria-label="Platform highlights">
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F4FD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>Escrow-backed payments</span>
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F4FD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Enforced 12-hour refund cutoff</span>
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F4FD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Signed QR and personal online links</span>
            </li>
          </ul>
        </div>

        {/* HERO VISUAL ARTWORK */}
        <div className="hero-visual" aria-label="Visual diagram of InterPay ticket and escrow flow">
          <div className="visual-card">
            <div className="visual-card-header">
              <BrandLogo size={28} />
              <span className="badge">Escrow Protected</span>
            </div>

            {/* Simulated Ticket Illustration */}
            <div className="visual-ticket">
              <div className="visual-ticket-main">
                <span className="muted small">INTERPAY VERIFIED PASS</span>
                <strong>Interswitch Tech & Founders Forum</strong>
                <span className="muted small">In person and online | Africa/Lagos</span>
                <div className="visual-ticket-tags">
                  <span className="badge">Signed QR Pass</span>
                  <span className="badge">12h Refund Policy</span>
                </div>
              </div>
              <div className="visual-ticket-qr" aria-hidden="true">
                <svg viewBox="0 0 80 80" width="68" height="68" fill="none">
                  <rect width="80" height="80" rx="6" fill="#EEF3FF" />
                  <rect x="10" y="10" width="22" height="22" stroke="#0B1B3F" strokeWidth="4" />
                  <rect x="17" y="17" width="8" height="8" fill="#1F4FD8" />
                  <rect x="48" y="10" width="22" height="22" stroke="#0B1B3F" strokeWidth="4" />
                  <rect x="55" y="17" width="8" height="8" fill="#1F4FD8" />
                  <rect x="10" y="48" width="22" height="22" stroke="#0B1B3F" strokeWidth="4" />
                  <rect x="17" y="55" width="8" height="8" fill="#1F4FD8" />
                  <rect x="46" y="46" width="8" height="8" fill="#0B1B3F" />
                  <rect x="60" y="46" width="10" height="8" fill="#1F4FD8" />
                  <rect x="46" y="60" width="14" height="10" fill="#1F4FD8" />
                  <rect x="64" y="60" width="6" height="10" fill="#0B1B3F" />
                </svg>
              </div>
            </div>

            {/* Escrow Pipeline Graphic */}
            <div className="escrow-pipeline">
              <div className="pipeline-step">
                <div className="pipeline-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F4FD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <div>
                  <strong>1. IPG Web Checkout</strong>
                  <span className="muted small">Verified server-side in kobo</span>
                </div>
              </div>

              <div className="pipeline-step active">
                <div className="pipeline-icon shield">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16794C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <strong>2. Held in Platform Escrow</strong>
                  <span className="muted small">Protected until event check-ins complete</span>
                </div>
              </div>

              <div className="pipeline-step">
                <div className="pipeline-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F4FD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <strong>3. Organiser Payout or Full Refund</strong>
                  <span className="muted small">Released after completion or refunded if cancelled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION WITH ILLUSTRATIONS */}
      <section id="how" className="section" aria-labelledby="how-heading">
        <div className="section-head">
          <div>
            <h2 id="how-heading">How InterPay works</h2>
            <p className="muted">Every ticket order follows a transparent, auditable ledger from checkout to event completion.</p>
          </div>
        </div>

        <ol className="steps-cards">
          <li className="step-card">
            <div className="step-illustration" aria-hidden="true">
              <svg viewBox="0 0 240 110" fill="none">
                <rect width="240" height="110" rx="6" fill="#EEF3FF" />
                <rect x="24" y="20" width="192" height="70" rx="6" fill="#FFFFFF" stroke="#D9E2F7" strokeWidth="2" />
                <rect x="40" y="36" width="84" height="10" rx="3" fill="#0B1B3F" />
                <rect x="40" y="54" width="56" height="8" rx="3" fill="#5B6B8C" />
                <rect x="148" y="38" width="52" height="28" rx="4" fill="#EEF3FF" stroke="#1F4FD8" strokeWidth="1.5" />
                <text x="174" y="56" textAnchor="middle" fill="#1F4FD8" fontSize="12" fontWeight="700">- 1 +</text>
              </svg>
            </div>
            <span className="step-num">Step 1</span>
            <h3>Register and choose your mode</h3>
            <p className="muted small">
              Select your ticket categories and choose in-person or online attendance. Your stock is reserved while you complete checkout.
            </p>
          </li>

          <li className="step-card">
            <div className="step-illustration" aria-hidden="true">
              <svg viewBox="0 0 240 110" fill="none">
                <rect width="240" height="110" rx="6" fill="#EEF3FF" />
                <rect x="45" y="18" width="150" height="74" rx="6" fill="#FFFFFF" stroke="#D9E2F7" strokeWidth="2" />
                <rect x="45" y="32" width="150" height="12" fill="#1F4FD8" />
                <rect x="60" y="56" width="60" height="8" rx="3" fill="#D9E2F7" />
                <rect x="60" y="70" width="40" height="8" rx="3" fill="#EEF3FF" />
                <circle cx="168" cy="66" r="14" fill="#16794C" />
                <path d="M162 66L166 70L174 62" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="step-num">Step 2</span>
            <h3>Pay on Interswitch Checkout</h3>
            <p className="muted small">
              Pay via card, transfer, USSD or Quickteller. Once verified by our server, your confirmation email and QR ticket arrive right away.
            </p>
          </li>

          <li className="step-card">
            <div className="step-illustration" aria-hidden="true">
              <svg viewBox="0 0 240 110" fill="none">
                <rect width="240" height="110" rx="6" fill="#EEF3FF" />
                <rect x="32" y="22" width="80" height="66" rx="6" fill="#FFFFFF" stroke="#D9E2F7" strokeWidth="2" />
                <rect x="46" y="34" width="52" height="42" rx="4" fill="#EEF3FF" />
                <path d="M58 55L68 65L86 45" stroke="#1F4FD8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M120 55H142" stroke="#1F4FD8" strokeWidth="2" strokeDasharray="3 3" />
                <rect x="148" y="22" width="60" height="66" rx="6" fill="#FFFFFF" stroke="#16794C" strokeWidth="2" />
                <circle cx="178" cy="48" r="12" fill="#EEF3FF" stroke="#16794C" strokeWidth="2" />
                <path d="M178 42V48L182 51" stroke="#16794C" strokeWidth="2" strokeLinecap="round" />
                <rect x="160" y="68" width="36" height="6" rx="3" fill="#16794C" />
              </svg>
            </div>
            <span className="step-num">Step 3</span>
            <h3>Attend or cancel before cutoff</h3>
            <p className="muted small">
              Scan your QR code at the venue or join online. If cancellation is enabled by the creator, you can cancel up to 12 hours before start.
            </p>
          </li>
        </ol>
      </section>

      {/* BUILT FOR ATTENDEES & ORGANISERS */}
      <section className="section" aria-labelledby="protection-heading">
        <h2 id="protection-heading">Built for both sides of every event</h2>
        <div className="feature-duo">
          <div className="panel feature-box">
            <div className="feature-icon-row">
              <span className="badge">For Attendees</span>
            </div>
            <h3>Clear refund rules and instant ticket delivery</h3>
            <ul className="clean-list">
              <li>Every event page clearly states whether cancellation is allowed before you pay.</li>
              <li>Confirmation emails include your QR pass, calendar file (.ics) and signed ticket link with no account required.</li>
              <li>If an organiser cancels an event, every paid ticket is refunded in full regardless of the toggle.</li>
            </ul>
            <div className="actions" style={{ marginTop: 12 }}>
              <Link className="btn ghost small" to="/find-tickets">Find my tickets</Link>
            </div>
          </div>

          <div className="panel feature-box">
            <div className="feature-icon-row">
              <span className="badge">For Organisers</span>
            </div>
            <h3>Flexible categories, flyers and live check-ins</h3>
            <ul className="clean-list">
              <li>Create physical, online or hybrid events with unlimited ticket categories and custom flyer galleries.</li>
              <li>Track sales, check-ins, refunds and held balances in real time over a persistent connection.</li>
              <li>Receive automated payouts to your verified bank account once the event completes.</li>
            </ul>
            <div className="actions" style={{ marginTop: 12 }}>
              <Link className="btn ghost small" to="/login">Publish an event</Link>
            </div>
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS DIRECTORY */}
      <section id="events" className="section" aria-labelledby="up">
        <div className="events-toolbar">
          <div>
            <h2 id="up">Upcoming events</h2>
            <p className="muted small" style={{ margin: 0 }}>Select an event to view flyers, venue directions, ticket categories and cancellation policy.</p>
          </div>
          <div className="events-filters">
            <input
              type="search"
              placeholder="Search events, topic or venue"
              aria-label="Search events"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 220 }}
            />
            <select aria-label="Filter by attendance mode" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} style={{ width: "auto" }}>
              <option value="ALL">All attendance modes</option>
              <option value="PHYSICAL">In person only</option>
              <option value="ONLINE">Online only</option>
              <option value="BOTH">In person and online</option>
            </select>
          </div>
        </div>

        {error && <p role="alert" className="notice error">Could not load events: {error}</p>}

        {filteredEvents && filteredEvents.length === 0 && (
          <div className="empty-events panel">
            <h3>No matching events found</h3>
            <p className="muted">
              {events && events.length === 0
                ? "No events are listed yet. Organisers can create and publish an event in a few minutes."
                : "Try clearing your search filter or switching the attendance mode."}
            </p>
            <div className="actions">
              {search || modeFilter !== "ALL" ? (
                <button className="btn ghost small" onClick={() => { setSearch(""); setModeFilter("ALL"); }}>Reset filters</button>
              ) : (
                <Link className="btn small" to="/login">Create the first event</Link>
              )}
            </div>
          </div>
        )}

        <div className="grid">
          {filteredEvents?.map((e) => (
            <article className="card event-card" key={e.id}>
              <Link to={e.canonical_path} className="card-media-link" tabIndex={-1} aria-hidden="true">
                {e.image ? (
                  <img className="pic" src={e.image} alt={`Flyer for ${e.title}`} loading="lazy" />
                ) : (
                  <CategoryArt category={e.category} />
                )}
              </Link>
              <div className="body">
                <div className="card-badges">
                  <Badge>{MODE_LABEL[e.attendance_mode]}</Badge>
                  <Badge>{e.category}</Badge>
                </div>
                <Link className="title" to={e.canonical_path}>{e.title}</Link>
                <span className="muted small">{formatDateTime(e.start_at, e.timezone)}</span>
                <span className="muted small">{e.venue_name ?? "Online event"}</span>
                <div className="card-footer">
                  <strong>
                    {e.from_price_kobo !== null
                      ? e.from_price_kobo === 0
                        ? "Free"
                        : `From ${naira(e.from_price_kobo)}`
                      : "View tickets"}
                  </strong>
                  <Link className="btn ghost small" to={e.canonical_path}>Get tickets</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}