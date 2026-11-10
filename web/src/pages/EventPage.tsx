import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EventPublic, formatDateTime, naira } from "@shared";
import { api } from "../api";
import { usePageMeta } from "../meta";
import { Badge, CategoryArt, Field, MODE_LABEL, Notice, Stepper } from "../ui";
import NotFound from "./NotFound";

const ATTENDANCE_LD: Record<string, string> = {
  PHYSICAL: "https://schema.org/OfflineEventAttendanceMode",
  ONLINE: "https://schema.org/OnlineEventAttendanceMode",
  BOTH: "https://schema.org/MixedEventAttendanceMode",
};

const STATE_TEXT: Record<string, string> = {
  SOLD_OUT: "Sold out",
  NOT_STARTED: "Sales not started",
  ENDED: "Sales ended",
};

export default function EventPage() {
  const { slug, year } = useParams();
  const nav = useNavigate();
  const [ev, setEv] = useState<EventPublic | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeFlyer, setActiveFlyer] = useState<string | null>(null);

  useEffect(() => {
    setEv(null);
    setErr("");
    api<EventPublic>(`/api/events/${slug}/${year}`)
      .then((d) => {
        setEv(d);
        if (d.canonical_path !== location.pathname) nav(d.canonical_path, { replace: true });
      })
      .catch((e) => setErr(e.message));
  }, [slug, year, nav]);

  const flyers = ev?.media.filter((m) => m.content_type.startsWith("image/")) ?? [];

  const jsonLd = useMemo(() => {
    if (!ev) return undefined;
    const locations: object[] = [];
    if (ev.attendance_mode !== "ONLINE") {
      locations.push({ "@type": "Place", name: ev.venue_name ?? "Venue", address: ev.venue_address ?? "" });
    }
    if (ev.attendance_mode !== "PHYSICAL") {
      locations.push({ "@type": "VirtualLocation", url: location.origin + ev.canonical_path });
    }
    return {
      "@context": "https://schema.org",
      "@type": "Event",
      name: ev.title,
      description: ev.description,
      startDate: ev.start_at,
      endDate: ev.end_at,
      eventStatus: ev.status === "CANCELLED" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
      eventAttendanceMode: ATTENDANCE_LD[ev.attendance_mode],
      location: locations.length === 1 ? locations[0] : locations,
      image: flyers.map((f) => f.url),
      organizer: {
        "@type": "Organization",
        name: ev.contact.name ?? "Organiser",
        email: ev.contact.email ?? undefined,
        telephone: ev.contact.phone ?? undefined,
      },
      offers: ev.categories
        .filter((c) => !c.is_hidden)
        .map((c) => ({
          "@type": "Offer",
          name: c.name,
          price: (c.price_kobo / 100).toFixed(2),
          priceCurrency: "NGN",
          availability: c.state === "SOLD_OUT" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
          url: location.origin + ev.canonical_path,
        })),
    };
  }, [ev, flyers]);

  usePageMeta({
    title: ev?.title ?? "Event",
    description: ev ? `${ev.title}. ${ev.description}`.slice(0, 200) : undefined,
    image: flyers[0]?.url,
    path: ev?.canonical_path,
    jsonLd,
  });

  if (err) return /not found/i.test(err) ? <NotFound /> : <main><Notice kind="error">{err}</Notice></main>;
  if (!ev) return <main><p className="muted">Loading event details...</p></main>;

  const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART:${ev.start_at.replace(/[-:]/g, "")}\r\nDTEND:${ev.end_at.replace(/[-:]/g, "")}\r\nSUMMARY:${ev.title}\r\nLOCATION:${ev.venue_name ?? "Online"}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
  const wa = ev.contact.whatsapp?.replace(/\D/g, "");
  const deadline = new Date(new Date(ev.start_at).getTime() - ev.cancel_window_hours * 3600e3).toISOString();
  const visibleCats = ev.categories.filter((c) => !c.is_hidden);
  const lowestPrice = visibleCats.length > 0 ? Math.min(...visibleCats.map((c) => c.price_kobo)) : null;

  const copyUrl = () => {
    navigator.clipboard?.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="event-detail-shell">
      {/* EVENT SHOWCASE TOP HEADER */}
      <div className="event-hero-banner">
        <div className="container">
          <p className="breadcrumb-row">
            <Link to="/events">&larr; Back to events directory</Link>
          </p>

          {ev.status === "DRAFT" && <Notice>Draft preview. Only you can see this page until you publish it.</Notice>}
          {ev.status === "CANCELLED" && <Notice kind="error">This event was cancelled. All tickets are refunded in full.</Notice>}

          <div className="event-hero-grid">
            <div className="event-hero-poster">
              {flyers[0] ? (
                <img
                  src={flyers[0].url}
                  alt={`Primary flyer for ${ev.title}`}
                  onClick={() => setActiveFlyer(flyers[0].url)}
                  style={{ cursor: "zoom-in" }}
                />
              ) : (
                <CategoryArt category={ev.category} />
              )}
            </div>

            <div className="event-hero-info">
              <div className="actions" style={{ marginBottom: 8 }}>
                <Badge>{MODE_LABEL[ev.attendance_mode]}</Badge>
                <Badge>{ev.category}</Badge>
                <Badge>{ev.cancellation_allowed ? "Refundable up to 12h before" : "Non-refundable"}</Badge>
              </div>

              <h1>{ev.title}</h1>

              <div className="event-key-facts">
                <div className="key-fact-row">
                  <span className="fact-label">STARTS</span>
                  <strong>{formatDateTime(ev.start_at, ev.timezone)}</strong>
                </div>
                <div className="key-fact-row">
                  <span className="fact-label">ENDS</span>
                  <strong>{formatDateTime(ev.end_at, ev.timezone)} ({ev.timezone})</strong>
                </div>
                <div className="key-fact-row">
                  <span className="fact-label">WHERE</span>
                  <strong>
                    {ev.attendance_mode === "ONLINE"
                      ? `Online on ${ev.online_platform ?? "Organiser platform"}`
                      : `${ev.venue_name ?? "Venue TBA"}${ev.venue_address ? `, ${ev.venue_address}` : ""}`}
                  </strong>
                </div>
              </div>

              <div className="actions" style={{ marginTop: 14 }}>
                <a className="btn small" href="#reg">
                  Select tickets
                </a>
                <button type="button" className="btn ghost small" onClick={copyUrl}>
                  {copied ? "Link copied" : "Copy event link"}
                </button>
                <a
                  className="btn ghost small"
                  href={`https://wa.me/?text=${encodeURIComponent(`${ev.title} ${location.href}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Share on WhatsApp
                </a>
                <a
                  className="btn ghost small"
                  href={`data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`}
                  download={`${ev.slug}.ics`}
                >
                  Add to calendar (.ics)
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN CONTENT + STICKY TICKET CHECKOUT */}
      <main>
        <div className="two">
          <div>
            <section aria-labelledby="about">
              <h2 id="about">About this event</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {ev.description || "The organiser has not added a description yet."}
              </p>
            </section>

            <section className="section" aria-labelledby="flyers">
              <h2 id="flyers">Event Flyers & Media</h2>
              {flyers.length === 0 && <p className="muted">The organiser has not uploaded flyers yet.</p>}
              <div className="flyers">
                {flyers.map((f) => (
                  <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveFlyer(f.url);
                    }}
                  >
                    <img src={f.url} alt={`Flyer for ${ev.title}`} loading="lazy" />
                  </a>
                ))}
              </div>
              {ev.media
                .filter((m) => m.content_type === "application/pdf")
                .map((m) => (
                  <p key={m.id} style={{ marginTop: 10 }}>
                    <a className="btn ghost small" href={m.url} target="_blank" rel="noreferrer">
                      Download PDF Flyer
                    </a>
                  </p>
                ))}
            </section>

            <section className="section" aria-labelledby="where">
              <h2 id="where">Venue & Attendance Details</h2>
              {ev.attendance_mode !== "ONLINE" && (
                <div className="panel" style={{ marginBottom: 12 }}>
                  <strong>{ev.venue_name ?? "In-person venue"}</strong>
                  {ev.venue_address && <p className="muted small" style={{ margin: "4px 0 10px" }}>{ev.venue_address}</p>}
                  {ev.map_url ? (
                    <a className="btn ghost small" href={ev.map_url} target="_blank" rel="noreferrer">
                      Open map and directions
                    </a>
                  ) : (
                    ev.venue_address && (
                      <a
                        className="btn ghost small"
                        href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(ev.venue_address)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Find on map
                      </a>
                    )
                  )}
                </div>
              )}
              {ev.attendance_mode !== "PHYSICAL" && (
                <div className="panel">
                  <strong>Online Attendance ({ev.online_platform ?? "Virtual Platform"})</strong>
                  <p className="muted small" style={{ margin: "4px 0 0" }}>
                    To prevent link sharing, your personal join link is generated and emailed to you immediately after payment verification.
                  </p>
                </div>
              )}
            </section>

            <section className="section" aria-labelledby="policy-sec">
              <h2 id="policy-sec">Escrow & Refund Policy</h2>
              <div className="panel">
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Funds held until completion:</strong> Your payment is processed through the Interswitch Payment Gateway and held by InterPay until the event takes place.
                </p>
                <p className="muted small" style={{ margin: 0 }}>
                  {ev.cancellation_allowed
                    ? `Attendees can self-cancel for a refund up until ${formatDateTime(deadline, ev.timezone)} (12 hours before start). After that cutoff, tickets are locked.`
                    : "The organiser has set this event to non-refundable. You cannot self-cancel after purchase, except if the organiser cancels or materially changes the event."}
                </p>
              </div>
            </section>

            <section className="section" aria-labelledby="contact">
              <h2 id="contact">Organiser Contact</h2>
              <div className="panel">
                {ev.contact.name && <strong style={{ display: "block", marginBottom: 6 }}>{ev.contact.name}</strong>}
                <div className="actions">
                  {ev.contact.email && (
                    <a className="btn ghost small" href={`mailto:${ev.contact.email}`}>
                      {ev.contact.email}
                    </a>
                  )}
                  {ev.contact.phone && (
                    <a className="btn ghost small" href={`tel:${ev.contact.phone}`}>
                      {ev.contact.phone}
                    </a>
                  )}
                  {wa && (
                    <a className="btn ghost small" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                      Message on WhatsApp
                    </a>
                  )}
                </div>
                {!ev.contact.email && !ev.contact.phone && !wa && (
                  <span className="muted small">No public contact details were provided by the organiser.</span>
                )}
              </div>
            </section>
          </div>

          <aside className="sticky-checkout-aside">
            <Register ev={ev} />
          </aside>
        </div>
      </main>

      {/* MOBILE STICKY TICKET CTA BAR (< 860px) */}
      {ev.sales_open && (
        <div className="mobile-Sticky-ticket-bar">
          <div>
            <span className="muted" style={{ fontSize: "0.72rem", display: "block" }}>
              {ev.cancellation_allowed ? "Escrow Protected • 12h Refund" : "Escrow Protected"}
            </span>
            <strong>
              {lowestPrice !== null ? (lowestPrice === 0 ? "Free Entry" : `From ${naira(lowestPrice)}`) : "Tickets Available"}
            </strong>
          </div>
          <a className="btn small" href="#reg">
            Get tickets
          </a>
        </div>
      )}

      {/* FLYER LIGHTBOX MODAL */}
      {activeFlyer && (
        <div className="lightbox-backdrop" onClick={() => setActiveFlyer(null)} role="dialog" aria-label="Flyer preview">
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <img src={activeFlyer} alt={`Enlarged flyer for ${ev.title}`} />
            <div className="actions" style={{ marginTop: 12, justifyContent: "space-between" }}>
              <a className="btn small" href={activeFlyer} target="_blank" rel="noreferrer" download>
                Open full image
              </a>
              <button type="button" className="btn ghost small" onClick={() => setActiveFlyer(null)}>
                Close preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Register({ ev }: { ev: EventPublic }) {
  const nav = useNavigate();
  const cats = ev.categories.filter((c) => !c.is_hidden);
  const [qty, setQty] = useState<Record<number, number>>(() =>
    cats.length === 1 && cats[0].state === "AVAILABLE" ? { [cats[0].id]: 1 } : {}
  );
  const [mode, setMode] = useState<"PHYSICAL" | "ONLINE" | "">(
    ev.attendance_mode === "BOTH" ? "" : (ev.attendance_mode as any)
  );
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [guests, setGuests] = useState<string[]>([]);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const eff = ev.attendance_mode === "BOTH" ? mode : ev.attendance_mode;
  const allowed = (c: (typeof cats)[number]) => !eff || c.allowed_modes.includes(eff);
  const lines = cats.filter((c) => allowed(c) && (qty[c.id] ?? 0) > 0);
  const total = lines.reduce((a, c) => a + qty[c.id], 0);
  const amount = lines.reduce((a, c) => a + qty[c.id] * c.price_kobo, 0);
  const deadline = new Date(new Date(ev.start_at).getTime() - ev.cancel_window_hours * 3600e3).toISOString();

  if (!ev.sales_open) {
    return (
      <div className="panel" id="reg">
        <h2>Tickets</h2>
        <p className="muted">Ticket sales are closed for this event.</p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!eff) return setErr("Choose whether you will attend in person or online");
    if (total < 1) return setErr("Select at least one ticket");
    setBusy(true);
    try {
      const r = await api<any>("/api/orders", {
        auth: false,
        body: {
          event_id: ev.id,
          items: lines.map((c) => ({ ticket_type_id: c.id, quantity: qty[c.id] })),
          ...f,
          attendance_mode: eff,
          accepted_policy: ok,
          guest_names: guests.slice(0, total),
          client: "web",
        },
      });
      if (r.checkout_url) window.location.href = r.checkout_url;
      else nav(`/tickets/${r.order_token}`);
    } catch (x: any) {
      setErr(x.message);
      setBusy(false);
    }
  };

  return (
    <form className="panel checkout-widget" onSubmit={submit} aria-labelledby="reg">
      <div className="checkout-widget-head">
        <h2 id="reg" style={{ margin: 0 }}>Get tickets</h2>
        <span className="badge">Protected by IPG</span>
      </div>

      {ev.attendance_mode === "BOTH" && (
        <fieldset className="field mode-toggle-group" style={{ border: 0, padding: 0, marginTop: 12 }}>
          <legend style={{ fontWeight: 600, marginBottom: 6 }}>How will you attend?</legend>
          <div className="mode-radio-cards">
            <label className={`mode-radio-card ${mode === "PHYSICAL" ? "selected" : ""}`}>
              <input
                type="radio"
                name="mode"
                style={{ width: "auto" }}
                checked={mode === "PHYSICAL"}
                onChange={() => setMode("PHYSICAL")}
              />
              <span>In person</span>
            </label>
            <label className={`mode-radio-card ${mode === "ONLINE" ? "selected" : ""}`}>
              <input
                type="radio"
                name="mode"
                style={{ width: "auto" }}
                checked={mode === "ONLINE"}
                onChange={() => setMode("ONLINE")}
              />
              <span>Online</span>
            </label>
          </div>
        </fieldset>
      )}

      <div className="ticket-tier-list">
        {cats.map((c) => {
          const can = c.state === "AVAILABLE" && allowed(c);
          const count = qty[c.id] ?? 0;
          return (
            <div className={`cat ${count > 0 ? "cat-active" : ""}`} key={c.id}>
              <div>
                <strong>{c.name}</strong>{" "}
                <span className="tier-price">{c.price_kobo === 0 ? "Free" : naira(c.price_kobo)}</span>
                {c.description && <div className="muted small">{c.description}</div>}
                <div className="muted small">
                  {!allowed(c)
                    ? `Not available for ${eff === "ONLINE" ? "online" : "in person"} attendance`
                    : STATE_TEXT[c.state] ?? `${c.available} left`}
                </div>
              </div>
              {can ? (
                <Stepper
                  label={c.name}
                  value={count}
                  min={0}
                  max={Math.min(c.max_per_order, c.available)}
                  onChange={(n) => setQty({ ...qty, [c.id]: n })}
                />
              ) : (
                <span className="badge">{STATE_TEXT[c.state] ?? "Unavailable"}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <Field label="First name">
          <input required value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} autoComplete="given-name" />
        </Field>
        <Field label="Last name">
          <input required value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} autoComplete="family-name" />
        </Field>
      </div>

      <Field label="Email address" hint="Your tickets and confirmation are sent here">
        <input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
      </Field>

      <Field label="Phone number" hint="Nigerian numbers (+234) or international format">
        <input type="tel" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" />
      </Field>

      {total > 1 && (
        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
            Add guest names (optional)
          </summary>
          <div style={{ marginTop: 8 }}>
            {Array.from({ length: total }, (_, i) => (
              <Field key={i} label={`Ticket ${i + 1} holder name`}>
                <input
                  value={guests[i] ?? ""}
                  onChange={(e) => {
                    const g = [...guests];
                    g[i] = e.target.value;
                    setGuests(g);
                  }}
                />
              </Field>
            ))}
          </div>
        </details>
      )}

      <Notice>
        {ev.cancellation_allowed
          ? `Cancellation is allowed. You can cancel for a refund until ${formatDateTime(deadline, ev.timezone)}. After that, tickets are locked.`
          : "This event does not allow cancellations. Tickets are not refundable unless the organiser cancels or materially changes the event."}
      </Notice>

      <label style={{ display: "flex", gap: 8, alignItems: "start", fontSize: ".88rem", cursor: "pointer" }}>
        <input
          type="checkbox"
          style={{ width: "auto", marginTop: 4 }}
          checked={ok}
          onChange={(e) => setOk(e.target.checked)}
          required
        />
        <span>
          I accept the cancellation policy and the{" "}
          <a href="/terms" target="_blank" rel="noreferrer">
            Terms and Conditions
          </a>
          .
        </span>
      </label>

      <div className="total">
        <span>Total ({total} ticket{total === 1 ? "" : "s"})</span>
        <span style={{ fontSize: "1.15rem", color: "var(--blue-600)" }}>
          {amount === 0 ? "Free" : naira(amount)}
        </span>
      </div>

      {amount > 0 && (
        <p className="muted small" style={{ marginTop: 0 }}>
          Processed via Interswitch Web Checkout. Standard gateway fees may apply.
        </p>
      )}

      {err && <Notice kind="error">{err}</Notice>}

      <button className="btn btn-lg" style={{ width: "100%" }} disabled={busy || total < 1}>
        {busy ? "Reserving your tickets..." : amount === 0 ? "Get free tickets" : "Continue to Interswitch checkout"}
      </button>
    </form>
  );
}