import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { OrderView, RealtimeClient, formatDateTime, naira } from "@shared";
import { WS_URL, api, wsTicket } from "../api";
import { usePageMeta } from "../meta";
import { Badge, Notice } from "../ui";

export default function TicketPage() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const [o, setO] = useState<OrderView | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [live, setLive] = useState("closed");
  usePageMeta({ title: o ? `Tickets for ${o.event.title}` : "Your tickets", description: "Your InterPay tickets and order status." });

  const load = useCallback(() => api<OrderView>(`/api/orders/${token}`, { auth: false }).then(setO).catch((e) => setErr(e.message)), [token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (o?.status === "PENDING" && params.get("status") === "pending") api<OrderView>(`/api/orders/${token}/verify`, { method: "POST", auth: false }).then(setO).catch(() => {});
  }, [o?.status]);
  useEffect(() => {
    const rt = new RealtimeClient({ url: WS_URL, getTicket: () => wsTicket({ order_token: token }, false), onEvent: () => load(), onRefetch: load, onStatus: setLive });
    rt.start();
    return () => rt.stop();
  }, [token]);

  const cancel = async (id: number) => {
    if (!confirm("Cancel this ticket? The ticket price will be refunded to your original payment method.")) return;
    try { setO(await api<OrderView>(`/api/tickets/${id}/cancel`, { method: "POST", headers: { "X-Order-Token": token! }, auth: false })); setMsg("Ticket cancelled. Your refund is being processed."); }
    catch (e: any) { setMsg(e.message); }
  };
  const resend = async () => { await api(`/api/orders/${token}/resend-confirmation`, { method: "POST", auth: false }); setMsg(`Confirmation email sent to ${o?.email}.`); };

  if (err) return <main><Notice kind="error">{err}</Notice></main>;
  if (!o) return <main><p className="muted">Loading your tickets</p></main>;
  const e = o.event;

  return (
    <main style={{ maxWidth: 760 }}>
      <h1>Your tickets</h1>
      <p><Link to={e.canonical_path}>{e.title}</Link> <span className="muted">| {formatDateTime(e.start_at, e.timezone)}</span></p>
      {o.status === "PENDING" && <Notice>Waiting for payment confirmation. This page updates by itself. <Link to={e.canonical_path}>Back to the event</Link></Notice>}
      {o.status === "EXPIRED" && <Notice kind="error">This checkout expired and the tickets were released. <Link to={e.canonical_path}>Start again</Link></Notice>}
      {o.status === "PAID" && <Notice kind="ok">Payment confirmed. A confirmation email with your tickets was sent to {o.email}.</Notice>}
      {e.status === "CANCELLED" && <Notice kind="error">The organiser cancelled this event. Your tickets are refunded in full.</Notice>}
      {msg && <Notice>{msg}</Notice>}
      <p className="muted small">Order {o.reference} | {o.amount_kobo === 0 ? "Free" : naira(o.amount_kobo)} | {live === "open" ? "Live updates on" : "Live updates reconnecting"}</p>

      {o.tickets.map((t, i) => (
        <article className="ticket" key={t.id}>
          {t.qr_url ? <img src={t.qr_url} alt={`QR code for ticket ${i + 1}`} /> : <div />}
          <div>
            <h2 style={{ fontSize: "1.05rem" }}>{t.category}{t.guest_name ? ` for ${t.guest_name}` : ""}</h2>
            <div className="actions"><Badge>{t.attendance_mode === "ONLINE" ? "Online" : "In person"}</Badge><Badge>{t.status === "CANCELLED" ? "Cancelled" : t.checked_in ? "Checked in" : "Valid"}</Badge></div>
            {t.join_url && t.status === "VALID" && <p><a className="btn small" href={t.join_url}>Join online</a></p>}
            {o.policy.can_cancel && t.status === "VALID" && <p><button className="btn danger small" onClick={() => cancel(t.id)}>Cancel this ticket</button></p>}
          </div>
        </article>
      ))}

      {o.status === "PAID" && (
        <section className="section">
          <h2>Cancellation policy</h2>
          <p>{o.policy.cancellation_allowed
            ? o.policy.can_cancel ? `You can cancel for a refund until ${formatDateTime(o.policy.deadline, e.timezone)}.` : o.policy.reason
            : "This event does not allow cancellations."}</p>
          <h2>Event details</h2>
          <p>{e.venue_name && <>{e.venue_name}, {e.venue_address}<br /></>}{e.map_url && <a href={e.map_url} target="_blank" rel="noreferrer">Open map</a>}</p>
          <p>{e.contact.email && <a href={`mailto:${e.contact.email}`}>{e.contact.email}</a>} {e.contact.phone}</p>
          <button className="btn ghost small" onClick={resend}>Resend confirmation email</button>
        </section>
      )}
    </main>
  );
}
