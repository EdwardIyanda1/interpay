import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { RealtimeClient, formatDateTime, naira } from "@shared";
import { WS_URL, api, wsTicket } from "../api";
import { useAuth } from "../App";
import { usePageMeta } from "../meta";
import { Badge, Notice } from "../ui";

const TABS = ["Overview", "Organisers", "Events", "Orders", "Payouts", "Refunds", "Emails", "Audit log"] as const;
type Tab = (typeof TABS)[number];
const PATH: Record<Tab, string> = { Overview: "stats", Organisers: "organisers", Events: "events", Orders: "orders", Payouts: "payouts", Refunds: "refunds", Emails: "notifications", "Audit log": "audit-log" };

export default function Admin() {
  usePageMeta({ title: "Admin", description: "Platform administration for InterPay." });
  const { user, ready } = useAuth();
  const [tab, setTab] = useState<Tab>("Overview");
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [live, setLive] = useState(false);

  const load = useCallback(() => api(`/api/admin/${PATH[tab]}`).then(setData).catch((e) => setMsg(e.message)), [tab]);
  useEffect(() => { setData(null); if (user?.role === "admin") load(); }, [tab, user]);
  useEffect(() => {
    if (user?.role !== "admin") return;
    const rt = new RealtimeClient({ url: WS_URL, getTicket: () => wsTicket(), onEvent: () => load(), onRefetch: load, onStatus: (s) => setLive(s === "open") });
    rt.start();
    return () => rt.stop();
  }, [user, load]);

  if (!ready) return <main><p className="muted">Loading</p></main>;
  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;
  const post = async (path: string, ok: string) => { try { await api(path, { method: "POST" }); setMsg(ok); load(); } catch (e: any) { setMsg((e as Error).message); } };
  const Btn = ({ path, label, ok = "Done" }: { path: string; label: string; ok?: string }) => <button className="btn ghost small" onClick={() => post(path, ok)}>{label}</button>;
  const money = (k: number) => naira(k);

  return (
    <main>
      <h1>Admin</h1>
      <p className="status-dot">{live ? "Live updates on" : "Live updates reconnecting"}</p>
      <div className="tabs" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className="btn ghost small" onClick={() => setTab(t)}>{t}</button>)}</div>
      {msg && <Notice>{msg}</Notice>}
      {!data ? <p className="muted">Loading</p> : tab === "Overview" ? (
        <>
          <div className="stats">
            {[["Tickets sold", data.tickets_sold], ["Gross sales", money(data.gross_kobo)], ["Refunded", money(data.refunded_kobo)], ["Held", money(data.held_kobo)],
              ["Paid out", money(data.paid_out_kobo)], ["Platform fees", money(data.platform_fees_kobo)], ["Events", data.events], ["Organisers to approve", data.organisers_pending],
              ["Failed emails", data.emails_failed], ["Payouts on hold", data.payouts_held]].map(([k, v]) => <div className="stat" key={k as string}><span className="muted small">{k}</span><b>{v}</b></div>)}
          </div>
          <Notice>Payment gateway: {data.gateway}. Payouts and refunds: {data.payout_mode}.{data.payout_mode === "simulated" && " Money movement for payouts and refunds is simulated."}</Notice>
        </>
      ) : (
        <div className="table-wrap"><table>
          {tab === "Organisers" && (<><thead><tr><th>Organiser</th><th>Events</th><th>Status</th><th>Payout account</th><th /></tr></thead><tbody>{data.map((o: any) => (
            <tr key={o.id}><td>{o.name || o.email}<div className="muted small">{o.email}</div></td><td>{o.events}</td><td><Badge>{o.suspended ? "Suspended" : o.approved ? "Approved" : "Pending"}</Badge></td>
              <td>{o.payout_account ? <>{o.payout_account.account_name} {o.payout_account.account_number}<div><Badge>{o.payout_account.verified ? "Verified" : "Unverified"}</Badge></div></> : "None"}</td>
              <td className="actions"><Btn path={`/api/admin/organisers/${o.id}/approve`} label="Approve" /><Btn path={`/api/admin/organisers/${o.id}/suspend`} label="Suspend" />
                {o.payout_account && !o.payout_account.verified && <Btn path={`/api/admin/organisers/${o.id}/verify-payout-account`} label="Verify account" />}</td></tr>))}</tbody></>)}
          {tab === "Events" && (<><thead><tr><th>Event</th><th>Status</th><th>Held</th><th /></tr></thead><tbody>{data.map((e: any) => (
            <tr key={e.id}><td><a href={`/event/${e.slug}/${e.year}`}>{e.title}</a><div className="muted small">{formatDateTime(e.start_at)}</div></td><td><Badge>{e.status}</Badge></td><td>{money(e.held_kobo)}</td>
              <td className="actions"><Btn path={`/api/admin/events/${e.id}/unpublish`} label="Unpublish" /><Btn path={`/api/admin/events/${e.id}/cancel`} label="Cancel and refund" /></td></tr>))}</tbody></>)}
          {tab === "Orders" && (<><thead><tr><th>Order</th><th>Event</th><th>Amount</th><th>Status</th><th /></tr></thead><tbody>{data.map((o: any) => (
            <tr key={o.id}><td>{o.reference}<div className="muted small">{o.email}</div></td><td>{o.event}</td><td>{money(o.amount_kobo)}</td><td><Badge>{o.status}</Badge> <span className="muted small">{o.attempts} attempt(s)</span></td>
              <td>{o.status !== "PAID" && <Btn path={`/api/admin/orders/${o.id}/reconcile`} label="Reconcile" ok="Reconciliation finished" />}</td></tr>))}</tbody></>)}
          {tab === "Payouts" && (<><thead><tr><th>Event</th><th>Gross</th><th>Fee</th><th>Payout</th><th>Status</th><th /></tr></thead><tbody>{data.map((p: any) => (
            <tr key={p.id}><td>{p.event}</td><td>{money(p.gross_kobo)}</td><td>{money(p.fee_kobo)}</td><td>{money(p.amount_kobo)}</td><td><Badge>{p.status}</Badge><div className="muted small">{p.hold_reason}</div></td>
              <td className="actions">{["PENDING", "FAILED"].includes(p.status) && <Btn path={`/api/admin/payouts/${p.id}/hold`} label="Hold" />}{["HELD", "FAILED"].includes(p.status) && <Btn path={`/api/admin/payouts/${p.id}/release`} label="Release" />}</td></tr>))}</tbody></>)}
          {tab === "Refunds" && (<><thead><tr><th>Refund</th><th>Amount</th><th>Reason</th><th>Status</th><th>Created</th></tr></thead><tbody>{data.map((r: any) => (
            <tr key={r.id}><td>#{r.id} (ticket {r.ticket_id})</td><td>{money(r.amount_kobo)}</td><td>{r.reason.replace(/_/g, " ").toLowerCase()}</td><td><Badge>{r.status}</Badge></td><td>{formatDateTime(r.created_at)}</td></tr>))}</tbody></>)}
          {tab === "Emails" && (<><thead><tr><th>Type</th><th>To</th><th>Status</th><th>Detail</th><th /></tr></thead><tbody>{data.map((n: any) => (
            <tr key={n.id}><td>{n.type}</td><td>{n.recipient}</td><td><Badge>{n.status}</Badge> <span className="muted small">{n.attempts} attempt(s)</span></td><td className="small">{n.error ?? (n.sent_at ? `Sent ${formatDateTime(n.sent_at)}` : "")}</td>
              <td>{n.status !== "PENDING" && <Btn path={`/api/admin/notifications/${n.id}/resend`} label="Resend" ok="Queued for sending" />}</td></tr>))}</tbody></>)}
          {tab === "Audit log" && (<><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead><tbody>{data.map((a: any) => <tr key={a.id}><td>{formatDateTime(a.at)}</td><td>{a.actor}</td><td>{a.action}</td><td>{a.entity} {a.detail}</td></tr>)}</tbody></>)}
        </table></div>
      )}
    </main>
  );
}
