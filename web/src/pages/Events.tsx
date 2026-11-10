import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EventCard, formatDateTime, naira } from "@shared";
import { api } from "../api";
import { usePageMeta } from "../meta";
import { Badge, CategoryArt, MODE_LABEL, Notice } from "../ui";

const CATEGORIES = [
  { id: "ALL", label: "All Events" },
  { id: "tech", label: "Tech & Innovation" },
  { id: "campus", label: "Campus" },
  { id: "community", label: "Community" },
  { id: "business", label: "Business" },
  { id: "health", label: "Health" },
  { id: "agriculture", label: "Agriculture" },
  { id: "arts", label: "Arts & Culture" },
  { id: "faith", label: "Faith" },
  { id: "sports", label: "Sports" },
];

type PriceFilter = "ALL" | "FREE" | "PAID";
type TimeFilter = "ALL" | "TODAY" | "WEEKEND" | "WEEK" | "MONTH";
type SortOrder = "SOONEST" | "PRICE_LOW" | "PRICE_HIGH";
type ViewMode = "GRID" | "LIST";

function formatShortDateBadge(iso: string, tz = "Africa/Lagos") {
  try {
    const d = new Date(iso);
    const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: tz }).format(d);
    const day = new Intl.DateTimeFormat("en-GB", { day: "2-digit", timeZone: tz }).format(d);
    const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: tz }).format(d);
    return { month: month.toUpperCase(), day, weekday };
  } catch {
    return { month: "EVT", day: "--", weekday: "---" };
  }
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isThisWeekend(d: Date, now: Date) {
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);
  if (diffDays < -0.5 || diffDays > 7) return false;
  const dayOfWeek = d.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  return dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
}

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [error, setError] = useState("");

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [venueQuery, setVenueQuery] = useState(() => searchParams.get("where") ?? "");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "ALL");
  const [mode, setMode] = useState(() => searchParams.get("mode") ?? "ALL");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>(() => (searchParams.get("price") as PriceFilter) || "ALL");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(() => (searchParams.get("when") as TimeFilter) || "ALL");
  const [sortBy, setSortBy] = useState<SortOrder>("SOONEST");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");
  const [quickPreview, setQuickPreview] = useState<EventCard | null>(null);

  usePageMeta({
    title: "Discover Events & Buy Protected Tickets",
    description: "Browse upcoming in-person, online, and hybrid events on InterPay. Every ticket purchase is protected by escrow on Interswitch IPG.",
    path: "/events",
  });

  useEffect(() => {
    api<EventCard[]>("/api/events", { auth: false })
      .then(setEvents)
      .catch((e) => setError(e.message));
  }, []);

  // Sync URL query parameters with active filters
  useEffect(() => {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (venueQuery.trim()) next.set("where", venueQuery.trim());
    if (category !== "ALL") next.set("category", category);
    if (mode !== "ALL") next.set("mode", mode);
    if (priceFilter !== "ALL") next.set("price", priceFilter);
    if (timeFilter !== "ALL") next.set("when", timeFilter);
    setSearchParams(next, { replace: true });
  }, [query, venueQuery, category, mode, priceFilter, timeFilter, setSearchParams]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: events?.length ?? 0 };
    if (!events) return counts;
    for (const ev of events) {
      const c = (ev.category || "community").toLowerCase();
      counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  const filtered = useMemo(() => {
    if (!events) return null;
    const nowDate = new Date();
    const now = nowDate.getTime();
    const weekMs = 7 * 24 * 3600 * 1000;
    const monthMs = 30 * 24 * 3600 * 1000;

    const list = events.filter((e) => {
      const cat = (e.category || "community").toLowerCase();
      if (category !== "ALL" && cat !== category) return false;
      if (mode !== "ALL" && e.attendance_mode !== mode) return false;

      if (priceFilter === "FREE" && e.from_price_kobo !== 0) return false;
      if (priceFilter === "PAID" && (e.from_price_kobo === null || e.from_price_kobo === 0)) return false;

      const startDate = new Date(e.start_at);
      const startMs = startDate.getTime();
      if (timeFilter === "TODAY" && !isSameDay(startDate, nowDate)) return false;
      if (timeFilter === "WEEKEND" && !isThisWeekend(startDate, nowDate)) return false;
      if (timeFilter === "WEEK" && (startMs < now || startMs > now + weekMs)) return false;
      if (timeFilter === "MONTH" && (startMs < now || startMs > now + monthMs)) return false;

      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${e.title} ${e.category} ${e.venue_name ?? "online"}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      const loc = venueQuery.trim().toLowerCase();
      if (loc) {
        const locHay = `${e.venue_name ?? "online"} ${e.attendance_mode}`.toLowerCase();
        if (!locHay.includes(loc)) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "PRICE_LOW") return (a.from_price_kobo ?? 0) - (b.from_price_kobo ?? 0);
      if (sortBy === "PRICE_HIGH") return (b.from_price_kobo ?? 0) - (a.from_price_kobo ?? 0);
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });
  }, [events, query, venueQuery, category, mode, priceFilter, timeFilter, sortBy]);

  const spotlightEvent = useMemo(() => {
    if (!events || events.length === 0) return null;
    return events[0];
  }, [events]);

  const hasActiveFilters =
    query.trim() !== "" ||
    venueQuery.trim() !== "" ||
    category !== "ALL" ||
    mode !== "ALL" ||
    priceFilter !== "ALL" ||
    timeFilter !== "ALL";

  const resetAll = () => {
    setQuery("");
    setVenueQuery("");
    setCategory("ALL");
    setMode("ALL");
    setPriceFilter("ALL");
    setTimeFilter("ALL");
    setSortBy("SOONEST");
  };

  return (
    <div className="events-page-shell">
      {/* MARKETPLACE DISCOVERY HERO HEADER */}
      <section className="marketplace-hero">
        <div className="container">
          <div className="marketplace-hero-top">
            <div>
              <span className="eyebrow-pill">
                <span className="eyebrow-dot" />
                <span>Escrow-Protected Event Box Office</span>
              </span>
              <h1 style={{ marginTop: 12, marginBottom: 8 }}>Discover events and book protected passes</h1>
              <p className="muted" style={{ maxWidth: 640, margin: 0 }}>
                Browse verified physical, online, and hybrid events. Every ticket order is processed through Interswitch IPG and held in escrow until the event takes place.
              </p>
            </div>
            <div className="marketplace-quick-actions">
              <Link className="btn ghost small" to="/find-tickets">
                Find my tickets
              </Link>
              <Link className="btn small" to="/login">
                Create an event
              </Link>
            </div>
          </div>

          {/* TIX / MYTICKETS STYLE SPLIT SEARCH + LOCATION + FILTERS BAR */}
          <div className="discovery-search-bar" role="search" aria-label="Filter events">
            <div className="discovery-inputs-split">
              <div className="discovery-input-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B6B8C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="search"
                  placeholder="Search event title or topic..."
                  aria-label="Search event title or topic"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button type="button" className="clear-search-btn" onClick={() => setQuery("")} aria-label="Clear search">
                    &times;
                  </button>
                )}
              </div>

              <div className="discovery-input-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B6B8C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  type="search"
                  placeholder="Venue, city, or 'online'..."
                  aria-label="Filter by venue or city"
                  value={venueQuery}
                  onChange={(e) => setVenueQuery(e.target.value)}
                />
                {venueQuery && (
                  <button type="button" className="clear-search-btn" onClick={() => setVenueQuery("")} aria-label="Clear location">
                    &times;
                  </button>
                )}
              </div>
            </div>

            <div className="discovery-selects">
              <select aria-label="Attendance mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="ALL">All modes</option>
                <option value="PHYSICAL">In person</option>
                <option value="ONLINE">Online</option>
                <option value="BOTH">Hybrid (Both)</option>
              </select>

              <select aria-label="Price tier" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}>
                <option value="ALL">Any price</option>
                <option value="FREE">Free entry</option>
                <option value="PAID">Paid tickets</option>
              </select>

              <select aria-label="Sort events" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOrder)}>
                <option value="SOONEST">Sort: Soonest</option>
                <option value="PRICE_LOW">Price: Low to high</option>
                <option value="PRICE_HIGH">Price: High to low</option>
              </select>
            </div>
          </div>

          {/* QUICK DATE CHIPS + CATEGORY SCROLLER */}
          <div className="discovery-chips-bar">
            <div className="quick-date-tabs" role="group" aria-label="Quick date filters">
              {(
                [
                  ["ALL", "All Dates"],
                  ["TODAY", "Today"],
                  ["WEEKEND", "This Weekend"],
                  ["WEEK", "Next 7 Days"],
                  ["MONTH", "Next 30 Days"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`date-chip ${timeFilter === id ? "active" : ""}`}
                  onClick={() => setTimeFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="category-pills-row" role="tablist" aria-label="Event categories">
              {CATEGORIES.map((c) => {
                const count = categoryCounts[c.id] ?? 0;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`category-pill ${active ? "active" : ""}`}
                    onClick={() => setCategory(c.id)}
                  >
                    <span>{c.label}</span>
                    {events && <span className="pill-count">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <main>
        {error && <Notice kind="error">Could not load events: {error}</Notice>}

        {/* SPOTLIGHT FEATURED EVENT BANNER (WHEN NO FILTERS ARE ACTIVE) */}
        {!hasActiveFilters && spotlightEvent && (
          <section className="spotlight-banner" aria-label="Featured upcoming event">
            <div className="spotlight-media">
              {spotlightEvent.image ? (
                <img src={spotlightEvent.image} alt={`Flyer for ${spotlightEvent.title}`} />
              ) : (
                <CategoryArt category={spotlightEvent.category} />
              )}
              <span className="spotlight-tag">Featured Box Office</span>
            </div>
            <div className="spotlight-content">
              <div className="card-badges">
                <Badge>{MODE_LABEL[spotlightEvent.attendance_mode]}</Badge>
                <Badge>{spotlightEvent.category}</Badge>
                <Badge>Escrow Protected</Badge>
              </div>
              <h2 className="spotlight-title">
                <Link to={spotlightEvent.canonical_path}>{spotlightEvent.title}</Link>
              </h2>
              <p className="muted small" style={{ margin: 0 }}>
                {formatDateTime(spotlightEvent.start_at, spotlightEvent.timezone)} &bull; {spotlightEvent.venue_name ?? "Online event"}
              </p>
              <div className="spotlight-footer">
                <div>
                  <span className="muted small" style={{ display: "block" }}>Tickets starting from</span>
                  <strong className="spotlight-price">
                    {spotlightEvent.from_price_kobo !== null
                      ? spotlightEvent.from_price_kobo === 0
                        ? "Free Entry"
                        : naira(spotlightEvent.from_price_kobo)
                      : "Available now"}
                  </strong>
                </div>
                <div className="actions">
                  <button type="button" className="btn ghost small" onClick={() => setQuickPreview(spotlightEvent)}>
                    Quick preview
                  </button>
                  <Link className="btn" to={spotlightEvent.canonical_path}>
                    Get tickets
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* RESULTS SUMMARY + VIEW SWITCHER (GRID / LIST) */}
        <div className="results-bar">
          <div className="results-count">
            <strong>
              {!filtered
                ? "Loading events..."
                : `${filtered.length} ${filtered.length === 1 ? "event" : "events"} available`}
            </strong>
            {hasActiveFilters && (
              <button type="button" className="btn ghost small" onClick={resetAll}>
                Reset all filters
              </button>
            )}
          </div>

          <div className="view-mode-toggle" role="group" aria-label="Layout view">
            <button
              type="button"
              className={`view-btn ${viewMode === "GRID" ? "active" : ""}`}
              onClick={() => setViewMode("GRID")}
              aria-pressed={viewMode === "GRID"}
            >
              Grid view
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === "LIST" ? "active" : ""}`}
              onClick={() => setViewMode("LIST")}
              aria-pressed={viewMode === "LIST"}
            >
              List view
            </button>
          </div>
        </div>

        {/* EMPTY STATE */}
        {filtered && filtered.length === 0 && (
          <div className="empty-events-card">
            <div className="empty-events-content">
              <span className="badge">No matches</span>
              <h2 style={{ marginTop: 10 }}>No events matched your filters</h2>
              <p className="muted">
                {events && events.length === 0
                  ? "No public events have been published yet. Sign in as an organiser to launch the first event."
                  : "Try clearing your search box, switching the category tab, or resetting the date and price filters."}
              </p>
              <div className="actions" style={{ marginTop: 14 }}>
                {hasActiveFilters ? (
                  <button type="button" className="btn small" onClick={resetAll}>
                    Reset all filters
                  </button>
                ) : (
                  <Link className="btn small" to="/login">
                    Create an event
                  </Link>
                )}
                <Link className="btn ghost small" to="/find-tickets">
                  Looking for an existing ticket?
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* MARKETPLACE EVENT DIRECTORY (GRID OR COMPACT LIST) */}
        {viewMode === "GRID" ? (
          <div className="grid marketplace-grid">
            {filtered?.map((e) => {
              const badgeDate = formatShortDateBadge(e.start_at, e.timezone);
              return (
                <article className="card ticket-stub-card" key={e.id}>
                  <Link to={e.canonical_path} className="card-media-link" tabIndex={-1} aria-hidden="true">
                    <div className="stub-media-wrap">
                      {e.image ? (
                        <img className="pic" src={e.image} alt={`Flyer for ${e.title}`} loading="lazy" />
                      ) : (
                        <CategoryArt category={e.category} />
                      )}
                      <div className="date-pill-badge">
                        <span className="date-pill-month">{badgeDate.month}</span>
                        <strong className="date-pill-day">{badgeDate.day}</strong>
                      </div>
                    </div>
                  </Link>

                  <div className="body">
                    <div className="card-badges">
                      <Badge>{MODE_LABEL[e.attendance_mode]}</Badge>
                      <Badge>{e.category}</Badge>
                    </div>

                    <Link className="title" to={e.canonical_path}>
                      {e.title}
                    </Link>

                    <div className="stub-meta-list">
                      <span className="muted small">{formatDateTime(e.start_at, e.timezone)}</span>
                      <span className="muted small">{e.venue_name ?? "Online event"}</span>
                    </div>

                    <div className="card-footer">
                      <div>
                        <span className="muted" style={{ fontSize: "0.7rem", display: "block", fontWeight: 600 }}>
                          PASSES
                        </span>
                        <strong className="price-tag">
                          {e.from_price_kobo !== null
                            ? e.from_price_kobo === 0
                              ? "Free"
                              : `From ${naira(e.from_price_kobo)}`
                            : "View prices"}
                        </strong>
                      </div>
                      <div className="actions" style={{ gap: 6 }}>
                        <button
                          type="button"
                          className="btn ghost small"
                          onClick={() => setQuickPreview(e)}
                          aria-label={`Quick preview ${e.title}`}
                        >
                          Preview
                        </button>
                        <Link className="btn small" to={e.canonical_path}>
                          Get tickets
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="event-list-stack">
            {filtered?.map((e) => {
              const badgeDate = formatShortDateBadge(e.start_at, e.timezone);
              return (
                <article className="event-row-card" key={e.id}>
                  <div className="event-row-date" aria-hidden="true">
                    <span className="date-pill-month">{badgeDate.month}</span>
                    <strong className="date-pill-day">{badgeDate.day}</strong>
                    <span className="muted" style={{ fontSize: "0.7rem" }}>{badgeDate.weekday}</span>
                  </div>

                  <div className="event-row-main">
                    <div className="card-badges">
                      <Badge>{MODE_LABEL[e.attendance_mode]}</Badge>
                      <Badge>{e.category}</Badge>
                    </div>
                    <Link className="title" to={e.canonical_path}>
                      {e.title}
                    </Link>
                    <span className="muted small">
                      {formatDateTime(e.start_at, e.timezone)} &bull; {e.venue_name ?? "Online event"}
                    </span>
                  </div>

                  <div className="event-row-actions">
                    <strong className="price-tag">
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
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* QUICK PREVIEW MODAL (TIX / MYTICKETS DRAWER STYLE) */}
      {quickPreview && (
        <div className="lightbox-backdrop" onClick={() => setQuickPreview(null)} role="dialog" aria-label="Event quick preview">
          <div className="quick-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quick-preview-top">
              <div className="card-badges">
                <Badge>{MODE_LABEL[quickPreview.attendance_mode]}</Badge>
                <Badge>{quickPreview.category}</Badge>
                <Badge>Escrow Protected</Badge>
              </div>
              <button type="button" className="btn ghost small" onClick={() => setQuickPreview(null)}>
                Close
              </button>
            </div>

            <div className="quick-preview-media">
              {quickPreview.image ? (
                <img src={quickPreview.image} alt={`Flyer for ${quickPreview.title}`} />
              ) : (
                <CategoryArt category={quickPreview.category} />
              )}
            </div>

            <h2 style={{ marginBottom: 6 }}>{quickPreview.title}</h2>
            <p className="muted small" style={{ margin: "0 0 12px" }}>
              <strong>Starts:</strong> {formatDateTime(quickPreview.start_at, quickPreview.timezone)} ({quickPreview.timezone})
              <br />
              <strong>Location:</strong> {quickPreview.venue_name ?? "Online event"}
            </p>

            <Notice>
              Ticket funds are collected via Interswitch Web Checkout and held in escrow until the event takes place.
            </Notice>

            <div className="quick-preview-footer">
              <div>
                <span className="muted small" style={{ display: "block" }}>Entry price</span>
                <strong style={{ fontSize: "1.15rem", color: "var(--blue-600)" }}>
                  {quickPreview.from_price_kobo !== null
                    ? quickPreview.from_price_kobo === 0
                      ? "Free"
                      : `From ${naira(quickPreview.from_price_kobo)}`
                    : "See ticket tiers"}
                </strong>
              </div>
              <Link className="btn" to={quickPreview.canonical_path} onClick={() => setQuickPreview(null)}>
                Open event page & buy tickets
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}