import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EventPublic, formatDateTime, naira } from "@shared";
import { api } from "../api";
import { usePageMeta } from "../meta";
import { Badge, Field, MODE_LABEL, Notice, Stepper } from "../ui";
import NotFound from "./NotFound";

const ATTENDANCE_LD: Record<string, string> = {
  PHYSICAL: "https://schema.org/OfflineEventAttendanceMode", ONLINE: "https://schema.org/OnlineEventAttendanceMode", BOTH: "https://schema.org/MixedEventAttendanceMode",
};
const STATE_TEXT: Record<string, string> = { SOLD_OUT: "Sold out", NOT_STARTED: "Sales not started", ENDED: "Sales ended" };

export default function EventPage() {
  const { slug, year } = useParams();
  const nav = useNavigate();
  const [ev, setEv] = useState<EventPublic | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setEv(null); setErr("");
    api<EventPublic>(`/api/events/${slug}/${year}`)
      .then((d) => { setEv(d); if (d.canonical_path !== location.pathname) nav(d.canonical_path, { replace: true }); })
      .catch((e) => setErr(e.message));
  }, [slug, year]);

  const flyers = ev?.media.filter((m) => m.content_type.startsWith("image/")) ?? [];
  const jsonLd = useMemo(() => {
    if (!ev) return undefined;
    const locations: object[] = [];
    if (ev.attendance_mode !== "ONLINE") locations.push({ "@type": "Place", name: ev.venue_name ?? "Venue", address: ev.venue_address ?? "" });
    if (ev.attendance_mode !== "PHYSICAL") locations.push({ "@type": "VirtualLocation", url: location.origin + ev.canonical_path });
    return {
      "@context": "https://schema.org", "@type": "Event", name: ev.title, description: ev.description, startDate: ev.start_at, endDate: ev.end_at,
      eventStatus: ev.status === "CANCELLED" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
      eventAttendanceMode: ATTENDANCE_LD[ev.attendance_mode], location: locations.length === 1 ? locations[0] : locations,
      image: flyers.map((f) => f.url),
      organizer: { "@type": "Organization", name: ev.contact.name ?? "Organiser", email: ev.contact.email ?? undefined, telephone: ev.contact.phone ?? undefined },
      offers: ev.categories.filter((c) => !c.is_hidden).map((c) => ({
        "@type": "Offer", name: c.name, price: (c.price_kobo / 100).toFixed(2), priceCurrency: "NGN",
        availability: c.state === "SOLD_OUT" ? "https://schema.org/SoldOut" : "https://schema.org/InStock", url: location.origin + ev.canonical_path,
      })),
    };
  }, [ev]);

  usePageMeta({
    title: ev?.title ?? "Event", description: ev ? `${ev.title}. ${ev.description}`.slice(0, 200) : undefined,
    image: flyers[0]?.url, path: ev?.canonical_path, jsonLd,
  });

  if (err) return /not found/i.test(err) ? <NotFound /> : <main><Notice kind="error">{err}</Notice></main>;
  if (!ev) return <main><p className="muted">Loading event</p></main>;

  const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART:${ev.start_at.replace(/[-:]/g, "")}\r\nDTEND:${ev.end_at.replace(/[-:]/g, "")}\r\nSUMMARY:${ev.title}\r\nLOCATION:${ev.venue_name ?? "Online"}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
  const wa = ev.contact.whatsapp?.replace(/\D/g, "");

  return (
    <main>
      {ev.status === "DRAFT" && <Notice>Draft preview. Only you can see this page until you publish it.</Notice>}
      {ev.status === "CANCELLED" && <Notice kind="error">This event was cancelled. All tickets are refunded in full.</Notice>}
      <header style={{ marginBottom: 16 }}>
        <div className="actions" style={{ marginBottom: 8 }}><Badge>{MODE_LABEL[ev.attendance_mode]}</Badge><Badge>{ev.category}</Badge></div>
        <h1>{ev.title}</h1>
        <p className="muted">{formatDateTime(ev.start_at, ev.timezone)} to {formatDateTime(ev.end_at, ev.timezone)}</p>
        <div className="actions">
          <button className="btn ghost small" onClick={() => navigator.clipboard?.writeText(location.href)}>Copy link</button>
          <a className="btn ghost small" href={`https://wa.me/?text=${encodeURIComponent(`${ev.title} ${location.href}`)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
          <a className="btn ghost small" href={`data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`} download={`${ev.slug}.ics`}>Add to calendar</a>
        </div>
      </header>

      <div className="two">
        <div>
          <section aria-labelledby="flyers">
            <h2 id="flyers">Flyers</h2>
            {flyers.length === 0 && <p className="muted">The organiser has not uploaded flyers yet.</p>}
            <div className="flyers">
              {flyers.map((f) => <a key={f.id} href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={`Flyer for ${ev.title}`} loading="lazy" /></a>)}
            </div>
            {ev.media.filter((m) => m.content_type === "application/pdf").map((m) => <p key={m.id}><a href={m.url} target="_blank" rel="noreferrer">Download the PDF flyer</a></p>)}
          </section>
          <section className="section" aria-labelledby="about"><h2 id="about">About this event</h2><p style={{ whiteSpace: "pre-wrap" }}>{ev.description || "The organiser has not added a description yet."}</p></section>
          <section className="section" aria-labelledby="where">
            <h2 id="where">Location</h2>
            {ev.attendance_mode !== "ONLINE" && (
              <p><strong>{ev.venue_name}</strong><br />{ev.venue_address}<br />
                {ev.map_url ? <a href={ev.map_url} target="_blank" rel="noreferrer">Open map and directions</a>
                  : ev.venue_address && <a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(ev.venue_address)}`} target="_blank" rel="noreferrer">Find on map</a>}</p>
            )}
            {ev.attendance_mode !== "PHYSICAL" && <p>Online on {ev.online_platform ?? "the organiser's platform"}. Your personal join link arrives by email after payment.</p>}
          </section>
          <section className="section" aria-labelledby="contact">
            <h2 id="contact">Contact the organiser</h2>
            <p>{ev.contact.name && <strong>{ev.contact.name}<br /></strong>}
              {ev.contact.email && <><a href={`mailto:${ev.contact.email}`}>{ev.contact.email}</a><br /></>}
              {ev.contact.phone && <><a href={`tel:${ev.contact.phone}`}>{ev.contact.phone}</a><br /></>}
              {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">Message on WhatsApp</a>}
              {!ev.contact.email && !ev.contact.phone && !wa && <span className="muted">No contact details were provided.</span>}</p>
          </section>
        </div>
        <aside><Register ev={ev} /></aside>
      </div>
    </main>
  );
}

function Register({ ev }: { ev: EventPublic }) {
  const nav = useNavigate();
  const cats = ev.categories.filter((c) => !c.is_hidden);
  const [qty, setQty] = useState<Record<number, number>>(() => (cats.length === 1 && cats[0].state === "AVAILABLE" ? { [cats[0].id]: 1 } : {}));
  const [mode, setMode] = useState<"PHYSICAL" | "ONLINE" | "">(ev.attendance_mode === "BOTH" ? "" : (ev.attendance_mode as any));
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

  if (!ev.sales_open) return <div className="panel"><h2>Tickets</h2><p className="muted">Ticket sales are closed for this event.</p></div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!eff) return setErr("Choose whether you will attend in person or online");
    if (total < 1) return setErr("Select at least one ticket");
    setBusy(true);
    try {
      const r = await api<any>("/api/orders", { auth: false, body: {
        event_id: ev.id, items: lines.map((c) => ({ ticket_type_id: c.id, quantity: qty[c.id] })), ...f, attendance_mode: eff,
        accepted_policy: ok, guest_names: guests.slice(0, total), client: "web" } });
      if (r.checkout_url) window.location.href = r.checkout_url;
      else nav(`/tickets/${r.order_token}`);
    } catch (x: any) { setErr(x.message); setBusy(false); }
  };

  return (
    <form className="panel" onSubmit={submit} aria-labelledby="reg">
      <h2 id="reg">Get tickets</h2>
      {ev.attendance_mode === "BOTH" && (
        <fieldset className="field" style={{ border: 0, padding: 0 }}>
          <legend>How will you attend?</legend>
          <label><input type="radio" name="mode" style={{ width: "auto" }} checked={mode === "PHYSICAL"} onChange={() => setMode("PHYSICAL")} /> In person</label>
          <label><input type="radio" name="mode" style={{ width: "auto" }} checked={mode === "ONLINE"} onChange={() => setMode("ONLINE")} /> Online</label>
        </fieldset>
      )}
      <div>
        {cats.map((c) => {
          const can = c.state === "AVAILABLE" && allowed(c);
          return (
            <div className="cat" key={c.id}>
              <div><strong>{c.name}</strong> <span>{c.price_kobo === 0 ? "Free" : naira(c.price_kobo)}</span>
                {c.description && <div className="muted small">{c.description}</div>}
                <div className="muted small">{!allowed(c) ? `Not available for ${eff === "ONLINE" ? "online" : "in person"} attendance` : STATE_TEXT[c.state] ?? `${c.available} left`}</div></div>
              {can ? <Stepper label={c.name} value={qty[c.id] ?? 0} min={0} max={Math.min(c.max_per_order, c.available)} onChange={(n) => setQty({ ...qty, [c.id]: n })} /> : <span />}
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <Field label="First name"><input required value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} autoComplete="given-name" /></Field>
        <Field label="Last name"><input required value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} autoComplete="family-name" /></Field>
      </div>
      <Field label="Email address" hint="Your tickets and confirmation are sent here"><input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
      <Field label="Phone number" hint="Nigerian numbers or with country code, for example +44"><input type="tel" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></Field>
      {total > 1 && (
        <details style={{ marginBottom: 12 }}>
          <summary>Add guest names (optional)</summary>
          {Array.from({ length: total }, (_, i) => (
            <Field key={i} label={`Ticket ${i + 1} name`}><input value={guests[i] ?? ""} onChange={(e) => { const g = [...guests]; g[i] = e.target.value; setGuests(g); }} /></Field>
          ))}
        </details>
      )}
      <Notice>{ev.cancellation_allowed
        ? `Cancellation is allowed. You can cancel for a refund until ${formatDateTime(deadline, ev.timezone)}. After that, tickets are locked.`
        : "This event does not allow cancellations. Tickets are not refundable unless the organiser cancels or materially changes the event."}</Notice>
      <label style={{ display: "flex", gap: 8, alignItems: "start", fontSize: ".9rem" }}>
        <input type="checkbox" style={{ width: "auto", marginTop: 4 }} checked={ok} onChange={(e) => setOk(e.target.checked)} required />
        <span>I have read the cancellation policy and the <a href="/terms" target="_blank" rel="noreferrer">Terms and Conditions</a>.</span>
      </label>
      <div className="total"><span>Total ({total} ticket{total === 1 ? "" : "s"})</span><span>{amount === 0 ? "Free" : naira(amount)}</span></div>
      {amount > 0 && <p className="muted small">The payment gateway may add a transaction fee at checkout.</p>}
      {err && <Notice kind="error">{err}</Notice>}
      <button className="btn" style={{ width: "100%" }} disabled={busy || total < 1}>{busy ? "Please wait" : amount === 0 ? "Get free tickets" : "Continue to payment"}</button>
    </form>
  );
}
