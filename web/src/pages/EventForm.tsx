import { useState } from "react";
import { EventPublic, utcToZoned, zonedToUtc } from "@shared";
import { Field, Notice } from "../ui";

const TZ = ["Africa/Lagos", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Africa/Accra"];
const CATS = ["community", "tech", "health", "agriculture", "faith", "campus", "business", "arts", "sports"];
const nul = (s: string) => (s.trim() === "" ? null : s.trim());
const num = (s: string) => (s.trim() === "" ? null : Number(s));

export default function EventForm({ initial, onSave, label }: { initial?: EventPublic | null; onSave: (p: any) => Promise<void>; label: string }) {
  const tz0 = initial?.timezone ?? "Africa/Lagos";
  const [f, setF] = useState({
    title: initial?.title ?? "", slug: initial?.slug ?? "", category: initial?.category ?? "community", description: initial?.description ?? "",
    timezone: tz0, start: initial ? utcToZoned(initial.start_at, tz0) : "", end: initial ? utcToZoned(initial.end_at, tz0) : "",
    attendance_mode: initial?.attendance_mode ?? "PHYSICAL", cancellation_allowed: initial?.cancellation_allowed ?? true,
    venue_name: initial?.venue_name ?? "", venue_address: initial?.venue_address ?? "", map_url: initial?.map_url ?? "",
    physical_capacity: initial?.physical_capacity?.toString() ?? "", online_platform: initial?.online_platform ?? "", online_url: initial?.online_url ?? "",
    online_capacity: initial?.online_capacity?.toString() ?? "", contact_name: initial?.contact.name ?? "", contact_email: initial?.contact.email ?? "",
    contact_phone: initial?.contact.phone ?? "", contact_whatsapp: initial?.contact.whatsapp ?? "", visibility: initial?.visibility ?? "PUBLIC",
    min_checkins: String(initial?.min_checkins ?? 1),
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  const physical = f.attendance_mode !== "ONLINE";
  const online = f.attendance_mode !== "PHYSICAL";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await onSave({
        title: f.title, ...(f.slug ? { slug: f.slug } : {}), category: f.category, description: f.description, timezone: f.timezone,
        start_at: zonedToUtc(f.start, f.timezone), end_at: zonedToUtc(f.end, f.timezone), attendance_mode: f.attendance_mode,
        cancellation_allowed: f.cancellation_allowed, venue_name: nul(f.venue_name), venue_address: nul(f.venue_address), map_url: nul(f.map_url),
        physical_capacity: num(f.physical_capacity), online_platform: nul(f.online_platform), online_url: nul(f.online_url), online_capacity: num(f.online_capacity),
        contact_name: nul(f.contact_name), contact_email: nul(f.contact_email), contact_phone: nul(f.contact_phone), contact_whatsapp: nul(f.contact_whatsapp),
        visibility: f.visibility, min_checkins: Number(f.min_checkins) || 0,
      });
    } catch (x: any) { setErr(x.message); }
    setBusy(false);
  };

  return (
    <form onSubmit={submit}>
      <Field label="Event title"><input required minLength={3} value={f.title} onChange={set("title")} /></Field>
      <div className="row">
        <Field label="Page address" hint={`Your event page will be /event/${f.slug || "event-title"}/year`}><input value={f.slug} onChange={set("slug")} placeholder="lead-city-tech-week" pattern="[a-z0-9\-]*" /></Field>
        <Field label="Topic"><select value={f.category} onChange={set("category")}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="Description"><textarea rows={5} value={f.description} onChange={set("description")} /></Field>
      <div className="row">
        <Field label="Timezone"><select value={f.timezone} onChange={set("timezone")}>{TZ.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Starts"><input type="datetime-local" required value={f.start} onChange={set("start")} /></Field>
        <Field label="Ends"><input type="datetime-local" required value={f.end} onChange={set("end")} /></Field>
      </div>
      <div className="row">
        <Field label="How can people attend?">
          <select value={f.attendance_mode} onChange={set("attendance_mode")}><option value="PHYSICAL">In person only</option><option value="ONLINE">Online only</option><option value="BOTH">In person and online</option></select>
        </Field>
        <Field label="Cancellation" hint="Saved with each order, so later changes only affect new buyers">
          <select value={f.cancellation_allowed ? "yes" : "no"} onChange={(e) => setF({ ...f, cancellation_allowed: e.target.value === "yes" })}>
            <option value="yes">Attendees can cancel until 12 hours before the start</option><option value="no">No cancellations, tickets are non-refundable</option>
          </select>
        </Field>
      </div>
      {physical && (
        <div className="row">
          <Field label="Venue name"><input value={f.venue_name} onChange={set("venue_name")} /></Field>
          <Field label="Venue address"><input value={f.venue_address} onChange={set("venue_address")} /></Field>
          <Field label="Map link" hint="Optional, for example a Google Maps link"><input type="url" value={f.map_url} onChange={set("map_url")} /></Field>
          <Field label="In person capacity" hint="Leave empty for no limit"><input inputMode="numeric" value={f.physical_capacity} onChange={set("physical_capacity")} /></Field>
        </div>
      )}
      {online && (
        <div className="row">
          <Field label="Online platform"><input value={f.online_platform} onChange={set("online_platform")} placeholder="Google Meet" /></Field>
          <Field label="Join link" hint="Only paid attendees receive it, through their personal join link"><input type="url" value={f.online_url} onChange={set("online_url")} /></Field>
          <Field label="Online capacity" hint="Leave empty for no limit"><input inputMode="numeric" value={f.online_capacity} onChange={set("online_capacity")} /></Field>
        </div>
      )}
      <h3>Contact details shown on the event page</h3>
      <div className="row">
        <Field label="Contact name"><input value={f.contact_name} onChange={set("contact_name")} /></Field>
        <Field label="Contact email"><input type="email" value={f.contact_email} onChange={set("contact_email")} /></Field>
        <Field label="Contact phone"><input type="tel" value={f.contact_phone} onChange={set("contact_phone")} /></Field>
        <Field label="WhatsApp number"><input type="tel" value={f.contact_whatsapp} onChange={set("contact_whatsapp")} /></Field>
      </div>
      <div className="row">
        <Field label="Listing"><select value={f.visibility} onChange={set("visibility")}><option value="PUBLIC">Public, listed on InterPay</option><option value="UNLISTED">Unlisted, only people with the link</option></select></Field>
        <Field label="Check-ins needed for payout" hint="The event counts as held when at least this many people check in or join"><input inputMode="numeric" value={f.min_checkins} onChange={set("min_checkins")} /></Field>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      <button className="btn" disabled={busy}>{busy ? "Saving" : label}</button>
    </form>
  );
}
