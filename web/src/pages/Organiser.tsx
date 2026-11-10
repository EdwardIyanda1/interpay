import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { EventCard, formatDateTime } from "@shared";
import { api } from "../api";
import { useAuth } from "../App";
import { usePageMeta } from "../meta";
import { Badge, Field, NavItem, Notice, WorkspaceShell } from "../ui";
import EventForm from "./EventForm";

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "events", label: "Events", icon: "calendar" },
  { id: "create", label: "Create event", icon: "ticket" },
  { id: "payouts", label: "Transactions & Payouts", icon: "wallet" },
  { id: "settings", label: "Payout settings", icon: "settings" },
];

export default function Organiser() {
  usePageMeta({ title: "Organiser Dashboard", description: "Create and manage your events on InterPay." });
  const { user, ready, signOut } = useAuth();
  const nav = useNavigate();

  const [section, setSection] = useState<string>("dashboard");
  const [period, setPeriod] = useState<string>("Today");
  const [events, setEvents] = useState<EventCard[]>([]);
  const [acct, setAcct] = useState<any>(null);
  const [form, setForm] = useState({ bank_code: "", account_number: "", account_name: "" });
  const [msg, setMsg] = useState("");

  const load = () => {
    api<EventCard[]>("/api/organiser/events").then(setEvents).catch(() => {});
    api<any>("/api/organiser/payout-account")
      .then((a) => {
        setAcct(a);
        if (a) {
          setForm({
            bank_code: a.bank_code ?? "",
            account_number: a.account_number ?? "",
            account_name: a.account_name ?? "",
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (!ready) return <main><p className="muted">Loading workspace...</p></main>;
  if (!user) return <Navigate to="/login" replace />;

  const firstName = (user.name || user.email.split("@")[0] || "Organiser").split(" ")[0];

  const publishedCount = useMemo(
    () => events.filter((e) => e.status === "PUBLISHED" || e.status === "COMPLETED" || e.status === "PAID_OUT").length,
    [events]
  );
  const totalTicketsSold = useMemo(
    () => events.reduce((acc, e) => acc + (e.tickets_sold ?? 0), 0),
    [events]
  );

  // 5-Step Onboarding Checklist (Tachpae style)
  const checklist = [
    {
      id: "create",
      done: events.length > 0,
      title: "Create your first event",
      desc: "Drop a flyer, set a date, and choose whether attendees can cancel up to 12 hours before start.",
      btnLabel: "Create event →",
      onClick: () => setSection("create"),
    },
    {
      id: "publish",
      done: publishedCount > 0,
      title: "Publish your event",
      desc: "Drafts cannot be discovered or sold. Publishing takes one click and you can keep editing afterwards.",
      btnLabel: events.length > 0 ? "Open Events →" : "Create first →",
      onClick: () => (events.length > 0 ? setSection("events") : setSection("create")),
    },
    {
      id: "bank",
      done: Boolean(acct?.account_number),
      title: "Add a payout bank account",
      desc: "Required so escrow funds settle to your bank account after your event completes.",
      btnLabel: "Set up payouts →",
      onClick: () => setSection("settings"),
    },
    {
      id: "approved",
      done: Boolean(user.approved && acct?.verified),
      title: "Account & bank verification",
      desc: "An InterPay admin verifies your organiser profile and bank account before your first payout.",
      btnLabel: "Check status →",
      onClick: () => setSection("payouts"),
    },
    {
      id: "sale",
      done: totalTicketsSold > 0,
      title: "Record your first ticket sale",
      desc: "Share your /event/slug/year link on WhatsApp so attendees can pay via Interswitch IPG.",
      btnLabel: "View events →",
      onClick: () => setSection("events"),
    },
  ];

  const completedSteps = checklist.filter((c) => c.done).length;

  const saveAcct = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const updated = await api("/api/organiser/payout-account", { method: "PUT", body: form });
      setAcct(updated);
      setMsg("Payout account saved. An admin verifies it before your first payout.");
    } catch (x: any) {
      setMsg(x.message);
    }
  };

  return (
    <WorkspaceShell
      user={user}
      onSignOut={signOut}
      title={`Welcome back, ${firstName}`}
      subtitle="An overview of your events, ticket sales, and escrow payouts"
      navItems={NAV_ITEMS.map((item) =>
        item.id === "events" ? { ...item, badge: events.length } : item
      )}
      activeId={section}
      onSelect={setSection}
      primaryAction={{ label: "+ Create event", onClick: () => setSection("create") }}
      period={period}
      onPeriodChange={setPeriod}
    >
      {!user.approved && (
        <Notice>
          Your organiser account is awaiting admin approval. You can create and publish events right away, and payouts release once approved.
        </Notice>
      )}

      {/* VIEW 1: DASHBOARD HOME */}
      {section === "dashboard" && (
        <div className="space-y-6">
          {/* Welcome Hero Banner (Matches Tachpae Screenshot) */}
          <section className="rounded-xl bg-[#EEF3FF] border border-brand-100 p-6 sm:p-7">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-600 mb-1.5">
              WELCOME TO INTERPAY
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-ink mb-2">
              {events.length === 0 ? "Let's ship your first event" : "Manage your live events & escrow ledger"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mb-5">
              Most organisers go from sign-up to first ticket sale in under 15 minutes. Run through the checklist below in any order to get your event page and escrow payout account ready.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn" onClick={() => setSection("create")}>
                + Create your {events.length === 0 ? "first " : ""}event
              </button>
              {events.length > 0 && (
                <button type="button" className="btn ghost" onClick={() => setSection("events")}>
                  View your {events.length} event{events.length === 1 ? "" : "s"}
                </button>
              )}
            </div>
          </section>

          {/* Quick KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs text-slate-500 font-medium">Total events</span>
              <strong className="block text-2xl font-bold text-ink mt-1">{events.length}</strong>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs text-slate-500 font-medium">Published</span>
              <strong className="block text-2xl font-bold text-brand-600 mt-1">{publishedCount}</strong>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs text-slate-500 font-medium">Tickets sold</span>
              <strong className="block text-2xl font-bold text-emerald-600 mt-1">{totalTicketsSold}</strong>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs text-slate-500 font-medium">Payout bank</span>
              <strong className="block text-sm font-bold text-ink mt-2">
                {acct ? (acct.verified ? "Verified" : "Pending review") : "Not set"}
              </strong>
            </div>
          </div>

          {/* Get Your Account Ready Checklist Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-ink m-0">Get your account ready</h3>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  A short checklist to set up everything you need before tickets start moving.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-7 h-7 rounded-full border-2 border-brand-600 flex items-center justify-center text-[11px] font-bold text-brand-600">
                  {completedSteps}
                </div>
                <div className="text-right leading-tight">
                  <span className="block text-[11px] text-slate-400 font-medium">Progress</span>
                  <strong className="text-xs text-ink">{completedSteps} / {checklist.length}</strong>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200/90 bg-white hover:border-brand-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        item.done
                          ? "bg-emerald-600 text-white"
                          : "border border-slate-300 text-slate-400 bg-slate-50"
                      }`}
                    >
                      {item.done ? "✓" : "+"}
                    </div>
                    <div>
                      <strong className={`block text-sm ${item.done ? "line-through text-slate-400" : "text-ink"}`}>
                        {item.title}
                      </strong>
                      <span className="block text-xs text-slate-500 mt-0.5">{item.desc}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="btn small shrink-0 self-start sm:self-center"
                  >
                    {item.btnLabel}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Events Preview Table */}
          {events.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-ink m-0">Your events</h3>
                <button type="button" className="btn ghost small" onClick={() => setSection("events")}>
                  View all
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Starts</th>
                      <th>Status</th>
                      <th>Tickets sold</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <strong className="text-ink">{e.title}</strong>
                          <div className="text-xs text-slate-400">{e.canonical_path}</div>
                        </td>
                        <td>{formatDateTime(e.start_at, e.timezone)}</td>
                        <td><Badge>{e.status}</Badge></td>
                        <td><strong>{e.tickets_sold ?? 0}</strong></td>
                        <td className="actions">
                          <Link className="btn small" to={`/organiser/events/${e.id}`}>
                            Manage
                          </Link>
                          <Link className="btn ghost small" to={e.canonical_path}>
                            Public page
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* VIEW 2: ALL ORGANISER EVENTS */}
      {section === "events" && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink m-0">Your events</h2>
              <p className="text-xs text-slate-500 m-0">
                Click Manage on any event to add ticket categories, upload flyers, export attendees, or view the escrow ledger.
              </p>
            </div>
            <button type="button" className="btn small" onClick={() => setSection("create")}>
              + Create new event
            </button>
          </div>

          {events.length === 0 ? (
            <div className="rounded-lg bg-brand-50/50 border border-brand-100 p-6 text-center space-y-3">
              <p className="text-sm text-slate-600 m-0">You have not created an event yet.</p>
              <button type="button" className="btn small" onClick={() => setSection("create")}>
                Create your first event
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Starts</th>
                    <th>Status</th>
                    <th>Tickets sold</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.title}</strong>
                        <div className="text-xs text-slate-400">{e.canonical_path}</div>
                      </td>
                      <td>{formatDateTime(e.start_at, e.timezone)}</td>
                      <td><Badge>{e.status}</Badge></td>
                      <td>{e.tickets_sold ?? 0}</td>
                      <td className="actions">
                        <Link className="btn small" to={`/organiser/events/${e.id}`}>
                          Manage event
                        </Link>
                        <Link className="btn ghost small" to={e.canonical_path}>
                          View page
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* VIEW 3: CREATE NEW EVENT */}
      {section === "create" && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink m-0">Create a new event</h2>
              <p className="text-xs text-slate-500 m-0">
                After saving the draft, you can add ticket categories, upload flyers, and publish in one click.
              </p>
            </div>
            <button type="button" className="btn ghost small" onClick={() => setSection("dashboard")}>
              Cancel
            </button>
          </div>
          <EventForm
            label="Create draft & continue to tickets →"
            onSave={async (p) => {
              const e = await api<any>("/api/organiser/events", { body: p });
              nav(`/organiser/events/${e.id}`);
            }}
          />
        </section>
      )}

      {/* VIEW 4 & 5: PAYOUT ACCOUNT & TRANSACTIONS */}
      {(section === "payouts" || section === "settings") && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-ink m-0">Payout bank account</h2>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Held ticket funds are disbursed to this account after your event ends and meets its minimum check-in threshold.
            </p>
          </div>

          {acct && (
            <div className="rounded-lg bg-brand-50 border border-brand-100 p-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <strong className="text-ink">{acct.account_name}</strong>
                <span className="block text-xs text-slate-500">
                  Account: {acct.account_number} &bull; Bank code: {acct.bank_code}
                </span>
              </div>
              <Badge>{acct.verified ? "Verified for Payouts" : "Awaiting Admin Verification"}</Badge>
            </div>
          )}

          <form onSubmit={saveAcct} className="space-y-3">
            <div className="row">
              <Field label="Bank code" hint="e.g. 058 for GTBank, 044 for Access">
                <input
                  required
                  placeholder="058"
                  value={form.bank_code}
                  onChange={(e) => setForm({ ...form, bank_code: e.target.value })}
                />
              </Field>
              <Field label="10-digit NUBAN account number">
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="0123456789"
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Verified account name">
              <input
                required
                placeholder="Edward Iyanda"
                value={form.account_name}
                onChange={(e) => setForm({ ...form, account_name: e.target.value })}
              />
            </Field>
            <button className="btn" type="submit">
              {acct ? "Update payout account" : "Save payout account"}
            </button>
          </form>

          {msg && <Notice>{msg}</Notice>}
        </section>
      )}
    </WorkspaceShell>
  );
}