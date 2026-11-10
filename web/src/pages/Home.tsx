import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EventCard, formatDateTime, naira } from "@shared";
import { api } from "../api";
import { usePageMeta } from "../meta";
import { Badge, CategoryArt, MODE_LABEL } from "../ui";

export default function Home() {
  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("ALL");

  usePageMeta({
    title: "Your flyer. Your ticket page. Protected in escrow.",
    description:
      "Upload your flyer, publish your event page, and collect ticket payments through Interswitch IPG with built-in escrow protection.",
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

  const heroEvent = events && events.length > 0 ? events[0] : null;

  return (
    <div>
      {/* FULL-BLEED DARK NAVY GRID HERO */}
      <section className="relative bg-navy text-white overflow-hidden py-14 sm:py-20 lg:py-24 border-b border-white/10">
        {/* Blueprint Grid Background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(31,79,216,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,79,216,0.14) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
          aria-hidden="true"
        />
        {/* Radial Blue Glow */}
        <div
          className="pointer-events-none absolute right-[8%] top-[15%] w-[440px] h-[440px] rounded-full opacity-40 blur-3xl bg-brand-600"
          aria-hidden="true"
        />

        <div className="container relative z-10 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center">
          {/* LEFT COLUMN: DISPLAY HEADLINE */}
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.65rem] font-bold text-white leading-[1.08] tracking-tight m-0">
              Your flyer.
              <br />
              Your{" "}
              <span className="relative inline-block text-emerald-400">
                ticket page.
                <svg
                  className="pointer-events-none absolute left-0 -bottom-2.5 w-full h-3.5"
                  viewBox="0 0 320 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M4 12C82 4 215 3 316 10" stroke="#34D399" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              Two clicks.
            </h1>

            <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl m-0">
              Upload it. Tap publish. People start buying through the Interswitch Payment Gateway. The money stays protected in escrow until your event happens, and your phone scans every ticket in one beep.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/login?mode=register"
                className="inline-flex items-center justify-center rounded-[6px] bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-3 text-sm no-underline transition"
              >
                Create your event
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center rounded-[6px] border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold px-5 py-3 text-sm no-underline transition"
              >
                See how it works
              </a>
              <Link
                to="/events"
                className="inline-flex items-center justify-center rounded-[6px] border border-white/15 bg-transparent hover:bg-white/5 text-slate-300 hover:text-white font-semibold px-4 py-3 text-sm no-underline transition"
              >
                Browse events
              </Link>
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs font-medium text-slate-400 list-none p-0 m-0">
              <li className="inline-flex items-center gap-1.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Free for free events</span>
              </li>
              <li className="inline-flex items-center gap-1.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>12-hour refund cutoff rule</span>
              </li>
              <li className="inline-flex items-center gap-1.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Escrow released after check-in</span>
              </li>
            </ul>
          </div>

          {/* RIGHT COLUMN: TILTED FLYER CARD + FLOATING GLASS TOASTS */}
          <div className="relative max-w-[400px] w-full mx-auto my-6 py-6 px-3">
            {/* Top-Right Floating Money / Escrow Toast */}
            <div className="absolute -top-2 right-0 sm:-right-3 z-20 rotate-3 rounded-xl border border-white/20 bg-[#0F1E3D]/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 shadow-2xl">
              <div className="w-9 h-9 rounded-full bg-emerald-400/15 border border-emerald-400/40 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                &#8358;
              </div>
              <div className="leading-tight">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ESCROW PROTECTED
                </span>
                <strong className="block text-sm text-white">Verified on IPG</strong>
                <span className="block text-[11px] text-slate-400">From InterPay &bull; Live ledger</span>
              </div>
            </div>

            {/* Main Tilted Event Card */}
            <div className="rounded-2xl border border-white/15 bg-[#0F1E3D] overflow-hidden shadow-[0_28px_60px_rgba(0,0,0,0.55)] -rotate-3 hover:rotate-0 transition duration-300">
              <div className="relative h-60 w-full overflow-hidden">
                {heroEvent?.image ? (
                  <img src={heroEvent.image} alt={heroEvent.title} className="w-full h-full object-cover block" />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background:
                        "radial-gradient(circle at 20% 20%, #38BDF8 0%, transparent 55%), linear-gradient(135deg, #0B1B3F 0%, #1F4FD8 55%, #0EA5E9 100%)",
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-navy/20 to-navy/90" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-sky-200 mb-1">
                    {heroEvent
                      ? formatDateTime(heroEvent.start_at, heroEvent.timezone)
                      : "SAT • IN PERSON & ONLINE"}
                  </span>
                  <strong className="block text-lg text-white leading-snug">
                    {heroEvent ? heroEvent.title : "Tech & Founders Festival in Lagos"}
                  </strong>
                </div>
              </div>

              <div className="p-4 bg-[#0B1730] space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Tickets from</span>
                  <strong className="text-base text-sky-400">
                    {heroEvent && heroEvent.from_price_kobo !== null
                      ? heroEvent.from_price_kobo === 0
                        ? "Free"
                        : naira(heroEvent.from_price_kobo)
                      : naira(1000)}
                  </strong>
                </div>
                <div className="h-1.5 w-full rounded bg-white/10 overflow-hidden">
                  <div className="h-full w-2/3 rounded bg-emerald-400" />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Held in escrow until completion</span>
                  <span>Instant QR pass</span>
                </div>
              </div>
            </div>

            {/* Bottom-Left Floating Real Ticket Scan Toast */}
            <div className="absolute bottom-1 left-0 sm:-left-3 z-20 -rotate-2 rounded-xl border border-white/20 bg-[#0F1E3D]/90 backdrop-blur-md px-4 py-2.5 flex items-center gap-3 shadow-2xl">
              <div className="w-8 h-8 rounded-full bg-emerald-400/15 border border-emerald-400/40 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="leading-tight">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  REAL TICKET
                </span>
                <strong className="block text-sm text-white">Signed QR Pass</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <main>
        <section id="how" className="py-12 border-b border-brand-100" aria-labelledby="how-heading">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
                HOW INTERPAY WORKS
              </span>
              <h2 id="how-heading" className="m-0">
                From flyer upload to verified payout
              </h2>
            </div>
            <p className="text-sm text-slate-500 max-w-md m-0">
              Every ticket purchase is recorded in an auditable kobo ledger from checkout to event completion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="panel space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-brand-600">01</span>
                <Badge>Organiser Control</Badge>
              </div>
              <h3>Upload your flyer &amp; set refund rules</h3>
              <p className="text-xs sm:text-sm text-slate-500 m-0">
                Publish a clean <code>/event/slug/year</code> page with unlimited ticket categories, physical or online modes, and a single toggle deciding whether attendees can cancel up to 12 hours before start.
              </p>
            </div>

            <div className="panel space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-brand-600">02</span>
                <Badge>Interswitch IPG</Badge>
              </div>
              <h3>Buyers pay into protected escrow</h3>
              <p className="text-xs sm:text-sm text-slate-500 m-0">
                Attendees pay via card, transfer, OPay, or USSD on the Interswitch Web Checkout. Once verified server-side, a confirmation email with their QR pass arrives right away.
              </p>
            </div>

            <div className="panel space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-brand-600">03</span>
                <Badge>Automated Settlement</Badge>
              </div>
              <h3>Scan tickets &amp; receive your payout</h3>
              <p className="text-xs sm:text-sm text-slate-500 m-0">
                Scan QR codes at the door or admit online attendees via personal join links. Once the event completes, held funds are released to your verified bank account.
              </p>
            </div>
          </div>
        </section>

        {/* UPCOMING EVENTS DIRECTORY PREVIEW */}
        <section id="events" className="pt-12" aria-labelledby="up">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
                LIVE DIRECTORY
              </span>
              <h2 id="up" className="mb-1">Upcoming events</h2>
              <p className="text-xs sm:text-sm text-slate-500 m-0">
                Select an event to view flyers, venue directions, ticket categories, and cancellation rules.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <input
                type="search"
                placeholder="Search events or venue..."
                aria-label="Search events"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sm:w-60"
              />
              <select
                aria-label="Filter by attendance mode"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="w-auto"
              >
                <option value="ALL">All modes</option>
                <option value="PHYSICAL">In person</option>
                <option value="ONLINE">Online</option>
                <option value="BOTH">Hybrid</option>
              </select>
              <Link className="btn ghost small" to="/events">
                Full directory &rarr;
              </Link>
            </div>
          </div>

          {error && <p role="alert" className="notice error">Could not load events: {error}</p>}

          {filteredEvents && filteredEvents.length === 0 && (
            <div className="panel bg-brand-50/60 p-6">
              <h3>No matching events found</h3>
              <p className="text-sm text-slate-500">
                {events && events.length === 0
                  ? "No public events are listed yet. Upload your flyer and publish the first event in minutes."
                  : "Try clearing your search filter or switching the attendance mode."}
              </p>
              <div className="actions mt-3">
                {search || modeFilter !== "ALL" ? (
                  <button className="btn ghost small" onClick={() => { setSearch(""); setModeFilter("ALL"); }}>
                    Reset filters
                  </button>
                ) : (
                  <Link className="btn small" to="/login?mode=register">
                    Create the first event
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="grid">
            {filteredEvents?.map((e) => (
              <article className="card" key={e.id}>
                <Link to={e.canonical_path} className="block no-underline" tabIndex={-1} aria-hidden="true">
                  {e.image ? (
                    <img className="pic" src={e.image} alt={`Flyer for ${e.title}`} loading="lazy" />
                  ) : (
                    <CategoryArt category={e.category} />
                  )}
                </Link>
                <div className="body">
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    <Badge>{MODE_LABEL[e.attendance_mode]}</Badge>
                    <Badge>{e.category}</Badge>
                  </div>
                  <Link className="title" to={e.canonical_path}>{e.title}</Link>
                  <span className="muted small">{formatDateTime(e.start_at, e.timezone)}</span>
                  <span className="muted small">{e.venue_name ?? "Online event"}</span>
                  <div className="card-footer">
                    <strong className="text-sm text-ink">
                      {e.from_price_kobo !== null
                        ? e.from_price_kobo === 0
                          ? "Free"
                          : `From ${naira(e.from_price_kobo)}`
                        : "View tickets"}
                    </strong>
                    <Link className="btn small" to={e.canonical_path}>
                      Get tickets
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}