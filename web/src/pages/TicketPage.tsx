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

  usePageMeta({
    title: o ? `Tickets for ${o.event.title}` : "Your tickets",
    description: "Your InterPay tickets, QR passes, and escrow refund status.",
  });

  const load = useCallback(
    () =>
      api<OrderView>(`/api/orders/${token}`, { auth: false })
        .then(setO)
        .catch((e) => setErr(e.message)),
    [token]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (o?.status === "PENDING" && params.get("status") === "pending") {
      api<OrderView>(`/api/orders/${token}/verify`, { method: "POST", auth: false })
        .then(setO)
        .catch(() => {});
    }
  }, [o?.status, params, token]);

  useEffect(() => {
    const rt = new RealtimeClient({
      url: WS_URL,
      getTicket: () => wsTicket({ order_token: token }, false),
      onEvent: () => load(),
      onRefetch: load,
      onStatus: setLive,
    });
    rt.start();
    return () => rt.stop();
  }, [token, load]);

  const cancel = async (id: number) => {
    if (!confirm("Cancel this ticket? The ticket price will be refunded to your original payment method.")) return;
    try {
      setO(
        await api<OrderView>(`/api/tickets/${id}/cancel`, {
          method: "POST",
          headers: { "X-Order-Token": token! },
          auth: false,
        })
      );
      setMsg("Ticket cancelled. Your refund is being processed.");
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  const resend = async () => {
    await api(`/api/orders/${token}/resend-confirmation`, { method: "POST", auth: false });
    setMsg(`Confirmation email sent to ${o?.email}.`);
  };

  if (err) return <main><Notice kind="error">{err}</Notice></main>;
  if (!o) return <main><p className="muted">Loading your tickets...</p></main>;
  const e = o.event;

  return (
    <main className="max-w-3xl">
      <div className="rounded-xl border border-brand-100 bg-[#F8FAFF] p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <Badge>Order {o.reference}</Badge>
          <span className="text-xs font-semibold text-slate-500">
            {live === "open" ? "● Live updates active" : "○ Reconnecting live updates"}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl mb-1">Your event passes</h1>
        <p className="text-sm text-slate-600 m-0">
          <Link to={e.canonical_path} className="font-bold no-underline hover:underline">
            {e.title}
          </Link>{" "}
          &bull; {formatDateTime(e.start_at, e.timezone)} &bull;{" "}
          <strong>{o.amount_kobo === 0 ? "Free" : naira(o.amount_kobo)}</strong>
        </p>
      </div>

      {o.status === "PENDING" && (
        <Notice>
          Waiting for payment confirmation from Interswitch IPG. This page updates automatically.{" "}
          <Link to={e.canonical_path}>Back to the event</Link>
        </Notice>
      )}
      {o.status === "EXPIRED" && (
        <Notice kind="error">
          This checkout expired and the reserved tickets were released. <Link to={e.canonical_path}>Start again</Link>
        </Notice>
      )}
      {o.status === "PAID" && (
        <Notice kind="ok">
          Payment confirmed and held in escrow. A confirmation email with your passes was sent to <strong>{o.email}</strong>.
        </Notice>
      )}
      {e.status === "CANCELLED" && (
        <Notice kind="error">The organiser cancelled this event. Your tickets are being refunded in full.</Notice>
      )}
      {msg && <Notice>{msg}</Notice>}

      <div className="space-y-4 my-5">
        {o.tickets.map((t, i) => (
          <article
            className="rounded-xl border border-brand-100 bg-white p-4 sm:p-5 shadow-sm grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 items-center"
            key={t.id}
          >
            {t.qr_url ? (
              <img
                src={t.qr_url}
                alt={`QR code for ticket ${i + 1}`}
                className="w-36 h-36 rounded-lg border border-brand-100 p-1.5 bg-white mx-auto sm:mx-0"
              />
            ) : (
              <div className="w-36 h-36 rounded-lg bg-brand-50 flex items-center justify-center text-xs font-bold text-brand-700 mx-auto sm:mx-0">
                Online Pass
              </div>
            )}
            <div className="space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                <Badge>{t.attendance_mode === "ONLINE" ? "Online" : "In person"}</Badge>
                <Badge>{t.status === "CANCELLED" ? "Cancelled" : t.checked_in ? "Checked in" : "Valid Pass"}</Badge>
              </div>
              <h2 className="text-lg font-bold text-ink m-0">
                {t.category}
                {t.guest_name ? ` — ${t.guest_name}` : ""}
              </h2>
              <p className="text-xs text-slate-500 m-0">
                Present this QR code at the venue entrance or use your personal join link below.
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                {t.join_url && t.status === "VALID" && (
                  <a className="btn small" href={t.join_url}>
                    Join online session
                  </a>
                )}
                {o.policy.can_cancel && t.status === "VALID" && (
                  <button className="btn danger small" onClick={() => cancel(t.id)}>
                    Cancel ticket for refund
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {o.status === "PAID" && (
        <section className="rounded-xl border border-brand-100 bg-white p-5 space-y-4">
          <div>
            <h3 className="m-0 mb-1">Cancellation &amp; Escrow Policy</h3>
            <p className="text-xs sm:text-sm text-slate-600 m-0">
              {o.policy.cancellation_allowed
                ? o.policy.can_cancel
                  ? `You can cancel for a full refund until ${formatDateTime(o.policy.deadline, e.timezone)} (12 hours before start).`
                  : o.policy.reason
                : "This event does not allow attendee cancellations."}
            </p>
          </div>

          <div className="border-t border-brand-100 pt-3">
            <h3 className="m-0 mb-1">Venue &amp; Organiser Contact</h3>
            <p className="text-xs sm:text-sm text-slate-600 m-0">
              {e.venue_name && (
                <>
                  <strong>{e.venue_name}</strong>, {e.venue_address}
                  <br />
                </>
              )}
              {e.map_url && (
                <a href={e.map_url} target="_blank" rel="noreferrer">
                  Open map directions
                </a>
              )}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 mb-3">
              {e.contact.email && <a href={`mailto:${e.contact.email}`}>{e.contact.email}</a>} {e.contact.phone}
            </p>
            <button className="btn ghost small" onClick={resend}>
              Resend confirmation email
            </button>
          </div>
        </section>
      )}
    </main>
  );
}