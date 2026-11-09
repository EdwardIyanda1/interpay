import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { EventCard, formatDateTime } from "@shared";
import { api } from "../api";
import { useAuth } from "../App";
import { usePageMeta } from "../meta";
import { Badge, Field, Notice } from "../ui";
import EventForm from "./EventForm";

export default function Organiser() {
  usePageMeta({ title: "My events", description: "Create and manage your events on InterPay." });
  const { user, ready } = useAuth();
  const nav = useNavigate();
  const [events, setEvents] = useState<EventCard[]>([]);
  const [creating, setCreating] = useState(false);
  const [acct, setAcct] = useState<any>(null);
  const [form, setForm] = useState({ bank_code: "", account_number: "", account_name: "" });
  const [msg, setMsg] = useState("");

  const load = () => {
    api<EventCard[]>("/api/organiser/events").then(setEvents).catch(() => {});
    api<any>("/api/organiser/payout-account").then(setAcct).catch(() => {});
  };
  useEffect(() => { if (user) load(); }, [user]);
  if (!ready) return <main><p className="muted">Loading</p></main>;
  if (!user) return <Navigate to="/login" replace />;

  const saveAcct = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setAcct(await api("/api/organiser/payout-account", { method: "PUT", body: form })); setMsg("Payout account saved. An admin verifies it before your first payout."); }
    catch (x: any) { setMsg(x.message); }
  };

  return (
    <main>
      <h1>My events</h1>
      {!user.approved && <Notice>Your organiser account is waiting for admin approval. You can create and publish events now, but payouts stay on hold until you are approved and your payout account is verified.</Notice>}
      <div className="actions"><button className="btn" onClick={() => setCreating(!creating)}>{creating ? "Close" : "Create an event"}</button></div>
      {creating && (
        <section className="panel" style={{ marginTop: 16 }} aria-labelledby="new">
          <h2 id="new">New event</h2>
          <EventForm label="Create draft" onSave={async (p) => { const e = await api<any>("/api/organiser/events", { body: p }); nav(`/organiser/events/${e.id}`); }} />
        </section>
      )}
      <section className="section" aria-labelledby="list">
        <h2 id="list">Your events</h2>
        {events.length === 0 && <p className="muted">You have not created an event yet.</p>}
        <div className="table-wrap">
          {events.length > 0 && (
            <table>
              <thead><tr><th>Event</th><th>Starts</th><th>Status</th><th>Tickets sold</th><th /></tr></thead>
              <tbody>{events.map((e) => (
                <tr key={e.id}><td><strong>{e.title}</strong></td><td>{formatDateTime(e.start_at, e.timezone)}</td><td><Badge>{e.status}</Badge></td><td>{e.tickets_sold}</td>
                  <td><Link className="btn ghost small" to={`/organiser/events/${e.id}`}>Manage</Link></td></tr>))}</tbody>
            </table>
          )}
        </div>
      </section>
      <section className="section" aria-labelledby="payout">
        <h2 id="payout">Payout account</h2>
        {acct && <p>{acct.account_name} | {acct.account_number} | bank code {acct.bank_code} | <Badge>{acct.verified ? "Verified" : "Awaiting verification"}</Badge></p>}
        <form onSubmit={saveAcct} style={{ maxWidth: 520 }}>
          <div className="row">
            <Field label="Bank code"><input required value={form.bank_code} onChange={(e) => setForm({ ...form, bank_code: e.target.value })} /></Field>
            <Field label="Account number"><input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></Field>
          </div>
          <Field label="Account name"><input required value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} /></Field>
          <button className="btn ghost">{acct ? "Update payout account" : "Save payout account"}</button>
        </form>
        {msg && <Notice>{msg}</Notice>}
      </section>
    </main>
  );
}
