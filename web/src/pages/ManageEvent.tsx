import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { EventPublic, RealtimeClient, formatDateTime, naira } from "@shared";
import { API, WS_URL, api, getToken, wsTicket } from "../api";
import { useAuth } from "../App";
import { usePageMeta } from "../meta";
import { Badge, Field, Notice } from "../ui";
import EventForm from "./EventForm";

const TABS = ["Overview", "Details", "Tickets", "Flyers", "Attendees", "Finances"] as const;

export default function ManageEvent() {
  const { id } = useParams();
  const { user, ready } = useAuth();
  const [ev, setEv] = useState<EventPublic | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  usePageMeta({ title: ev ? `Manage ${ev.title}` : "Manage event", description: "Manage your event on InterPay." });

  const load = useCallback(() => api<EventPublic>(`/api/organiser/events/${id}`).then(setEv).catch((e) => setMsg({ kind: "error", text: e.message })), [id]);
  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => {
    if (!user) return;
    const rt = new RealtimeClient({ url: WS_URL, getTicket: () => wsTicket(), onEvent: (e) => e.topic === `event:${id}` && load(), onRefetch: load });
    rt.start();
    return () => rt.stop();
  }, [user, id, load]);

  if (!ready) return <main><p className="muted">Loading</p></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (!ev) return <main>{msg ? <Notice kind="error">{msg.text}</Notice> : <p className="muted">Loading event</p>}</main>;

  const act = async (fn: () => Promise<any>, ok: string) => {
    try { await fn(); setMsg({ kind: "ok", text: ok }); await load(); } catch (e: any) { setMsg({ kind: "error", text: e.message }); }
  };
  const editable = !["CANCELLED", "COMPLETED", "PAID_OUT", "NEEDS_REVIEW"].includes(ev.status);

  return (
    <main>
      <p><Link to="/organiser">Back to my events</Link></p>
      <h1>{ev.title}</h1>
      <p><Badge>{ev.status}</Badge> <Link to={ev.canonical_path}>{location.origin}{ev.canonical_path}</Link></p>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="tabs" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className="btn ghost small" onClick={() => setTab(t)}>{t}</button>)}</div>

      {tab === "Overview" && (
        <section>
          <div className="stats">
            {[["Tickets sold", ev.stats?.tickets_sold], ["Cancelled", ev.stats?.tickets_cancelled], ["Gross sales", naira(ev.stats?.gross_kobo ?? 0)],
              ["Refunded", naira(ev.stats?.refunded_kobo ?? 0)], ["Held", naira(ev.stats?.held_kobo ?? 0)], ["Check-ins", ev.stats?.checkins]].map(([k, v]) => (
              <div className="stat" key={k as string}><span className="muted small">{k}</span><b>{v}</b></div>))}
          </div>
          {ev.stats?.payout && <Notice>Payout: {naira(ev.stats.payout.amount_kobo)} (fee {naira(ev.stats.payout.fee_kobo)}). Status: {ev.stats.payout.status}{ev.stats.payout.hold_reason ? `. ${ev.stats.payout.hold_reason}` : ""}</Notice>}
          <div className="actions">
            {ev.status === "DRAFT" && <button className="btn" onClick={() => act(() => api(`/api/organiser/events/${id}/publish`, { method: "POST" }), "Event published")}>Publish event</button>}
            {editable && ev.status !== "DRAFT" && <button className="btn danger" onClick={() => confirm("Cancel this event? Every ticket will be refunded in full.") && act(() => api(`/api/organiser/events/${id}/cancel`, { method: "POST" }), "Event cancelled, refunds are being processed")}>Cancel event and refund everyone</button>}
          </div>
          <p className="muted small">Money is released to you after the event ends, once at least {ev.min_checkins} check-in(s) or online join(s) are recorded.</p>
        </section>
      )}

      {tab === "Details" && (editable ? <EventForm initial={ev} label="Save changes" onSave={async (p) => { await api(`/api/organiser/events/${id}`, { method: "PATCH", body: p }); setMsg({ kind: "ok", text: "Saved. If the date, venue or attendance mode changed, buyers were notified and can cancel for a refund." }); await load(); }} /> : <Notice>This event can no longer be edited.</Notice>)}

      {tab === "Tickets" && <Categories ev={ev} reload={load} setMsg={setMsg} />}
      {tab === "Flyers" && <Flyers ev={ev} reload={load} setMsg={setMsg} />}
      {tab === "Attendees" && <Attendees id={id!} />}
      {tab === "Finances" && <Finances id={id!} />}
    </main>
  );
}

function Categories({ ev, reload, setMsg }: any) {
  const [c, setC] = useState({ name: "", description: "", price: "0", quantity: "50", max_per_order: "10", physical: true, online: ev.attendance_mode !== "PHYSICAL" });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const modes = [c.physical && "PHYSICAL", c.online && "ONLINE"].filter(Boolean).join(",");
    try {
      await api(`/api/organiser/events/${ev.id}/categories`, { body: { name: c.name, description: c.description, price_kobo: Math.round(Number(c.price) * 100), quantity: Number(c.quantity), max_per_order: Number(c.max_per_order), allowed_modes: modes, sort_order: ev.categories.length } });
      setC({ ...c, name: "", description: "" }); await reload(); setMsg({ kind: "ok", text: "Category added" });
    } catch (x: any) { setMsg({ kind: "error", text: x.message }); }
  };
  const call = async (fn: () => Promise<any>) => { try { await fn(); await reload(); } catch (x: any) { setMsg({ kind: "error", text: x.message }); } };
  return (
    <section>
      <div className="table-wrap"><table>
        <thead><tr><th>Category</th><th>Price</th><th>Sold / total</th><th>Modes</th><th /></tr></thead>
        <tbody>{ev.categories.map((k: any) => (
          <tr key={k.id}><td><strong>{k.name}</strong>{k.is_hidden && <> <Badge>Hidden</Badge></>}<div className="muted small">{k.description}</div></td>
            <td>{k.price_kobo === 0 ? "Free" : naira(k.price_kobo)}</td><td>{k.quantity - k.available} / {k.quantity}</td><td>{k.allowed_modes.join(", ")}</td>
            <td className="actions">
              <button className="btn ghost small" onClick={() => call(() => api(`/api/organiser/categories/${k.id}`, { method: "PATCH", body: { is_hidden: !k.is_hidden } }))}>{k.is_hidden ? "Show" : "Hide"}</button>
              <button className="btn danger small" onClick={() => confirm("Delete this category? If tickets were sold it is hidden instead.") && call(() => api(`/api/organiser/categories/${k.id}`, { method: "DELETE" }))}>Delete</button></td></tr>))}</tbody>
      </table></div>
      <form className="panel" onSubmit={add} style={{ marginTop: 16 }}>
        <h3>Add a ticket category</h3>
        <p className="muted small">Add as many categories as you need, for example Regular, VIP, Student or Online pass.</p>
        <div className="row">
          <Field label="Name"><input required value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
          <Field label="Price in naira" hint="0 for a free category"><input required inputMode="decimal" value={c.price} onChange={(e) => setC({ ...c, price: e.target.value })} /></Field>
          <Field label="Number of tickets"><input required inputMode="numeric" value={c.quantity} onChange={(e) => setC({ ...c, quantity: e.target.value })} /></Field>
          <Field label="Max per order"><input required inputMode="numeric" value={c.max_per_order} onChange={(e) => setC({ ...c, max_per_order: e.target.value })} /></Field>
        </div>
        <Field label="Description"><input value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} /></Field>
        {ev.attendance_mode === "BOTH" && (<p>Valid for: <label><input type="checkbox" style={{ width: "auto" }} checked={c.physical} onChange={(e) => setC({ ...c, physical: e.target.checked })} /> In person</label>{" "}
          <label><input type="checkbox" style={{ width: "auto" }} checked={c.online} onChange={(e) => setC({ ...c, online: e.target.checked })} /> Online</label></p>)}
        <button className="btn">Add category</button>
      </form>
    </section>
  );
}

function Flyers({ ev, reload, setMsg }: any) {
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file); form.append("kind", "FLYER");
    try { await api(`/api/organiser/events/${ev.id}/media`, { form }); await reload(); setMsg({ kind: "ok", text: "Flyer uploaded" }); } catch (x: any) { setMsg({ kind: "error", text: x.message }); }
    e.target.value = "";
  };
  return (
    <section>
      <Field label="Upload a flyer" hint="PNG, JPEG, WebP or PDF, up to 5 MB. Upload as many as you need."><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={upload} /></Field>
      <div className="flyers">{ev.media.map((m: any) => (
        <div key={m.id}>{m.content_type.startsWith("image/") ? <img src={m.url} alt={`Flyer for ${ev.title}`} /> : <a href={m.url}>PDF flyer</a>}
          <button className="btn danger small" style={{ marginTop: 6 }} onClick={() => api(`/api/organiser/media/${m.id}`, { method: "DELETE" }).then(reload)}>Remove</button></div>))}</div>
      {ev.media.length === 0 && <p className="muted">No flyers yet. Attendees see them on your event page.</p>}
    </section>
  );
}

function Attendees({ id }: { id: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("");
  useEffect(() => { api<any[]>(`/api/organiser/events/${id}/attendees?${new URLSearchParams({ ...(q && { q }), ...(mode && { mode }) })}`).then(setRows); }, [id, q, mode]);
  const csv = async () => {
    const r = await fetch(`${API}/api/organiser/events/${id}/attendees.csv`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await r.blob()); a.download = `attendees-${id}.csv`; a.click();
  };
  return (
    <section>
      <div className="row"><Field label="Search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone or order" /></Field>
        <Field label="Attendance"><select value={mode} onChange={(e) => setMode(e.target.value)}><option value="">All</option><option value="PHYSICAL">In person</option><option value="ONLINE">Online</option></select></Field></div>
      <button className="btn ghost small" onClick={csv}>Export CSV</button>
      <div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Contact</th><th>Category</th><th>Mode</th><th>Status</th><th /></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.ticket_id}><td>{r.name}{r.guest_name && <div className="muted small">Guest: {r.guest_name}</div>}</td><td>{r.email}<div className="muted small">{r.phone}</div></td><td>{r.category}</td><td>{r.mode === "ONLINE" ? "Online" : "In person"}</td>
            <td>{r.status === "CANCELLED" ? "Cancelled" : r.checked_in ? "Checked in" : "Valid"}</td>
            <td><button className="btn ghost small" onClick={() => api(`/api/organiser/events/${id}/orders/${r.order_id}/resend`, { method: "POST" })}>Resend email</button></td></tr>))}</tbody>
      </table></div>
      {rows.length === 0 && <p className="muted">No attendees match.</p>}
    </section>
  );
}

function Finances({ id }: { id: string }) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api(`/api/organiser/events/${id}/ledger`).then(setD); }, [id]);
  if (!d) return <p className="muted">Loading</p>;
  return (
    <section>
      <p>Funds held right now: <strong>{naira(d.held_kobo)}</strong></p>
      <div className="table-wrap"><table>
        <thead><tr><th>When</th><th>Type</th><th>Amount</th></tr></thead>
        <tbody>{d.entries.map((e: any) => <tr key={e.id}><td>{formatDateTime(e.at)}</td><td>{e.type.replace(/_/g, " ").toLowerCase()}</td><td>{naira(e.amount_kobo)}</td></tr>)}</tbody>
      </table></div>
    </section>
  );
}
