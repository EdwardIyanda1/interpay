import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth, User } from "../App";
import { usePageMeta } from "../meta";
import { BrandLogo, Notice } from "../ui";

export default function Login() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [f, setF] = useState({ email: "", password: "", name: "", phone: "" });
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const { signIn } = useAuth();
  const nav = useNavigate();

  usePageMeta({
    title: mode === "login" ? "Organiser sign in" : "Create your account",
    description: "Sign in or create an organiser account to publish events with escrow protection on InterPay.",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const payload = mode === "register" ? { email: f.email, password: f.password, name: f.name } : { email: f.email, password: f.password };
      const r = await api<{ token: string; user: User }>(`/api/auth/${mode}`, { body: payload, auth: false });
      signIn(r.token, r.user);
      nav(r.user.role === "admin" ? "/admin" : "/organiser");
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] bg-white">
      {/* LEFT PANEL: DEEP NAVY GRADIENT SHOWCASE */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-[#0F297A] via-[#09194D] to-[#040B24] text-white overflow-hidden">
        {/* Subtle radial light & architectural grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
          aria-hidden="true"
        />

        {/* Top-left Brand Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="no-underline inline-flex items-center gap-2.5">
            <BrandLogo size={34} dark />
          </Link>
          <Link
            to="/events"
            className="text-xs font-semibold text-blue-200 hover:text-white no-underline border border-white/15 rounded-[6px] px-3 py-1.5 transition"
          >
            Browse public events &rarr;
          </Link>
        </div>

        {/* Bottom-left Headline & Pitch */}
        <div className="relative z-10 max-w-lg mt-auto">
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight mb-4">
            Sell tickets to events that actually hold trust.
          </h2>
          <p className="text-sm xl:text-base text-slate-300 leading-relaxed m-0">
            Create, publish, and run your event in one place. Manage unlimited ticket categories, flyers, live QR check-ins, and automated Interswitch escrow payouts without the spreadsheet.
          </p>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-6 text-xs font-semibold text-blue-200">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Interswitch IPG Checkout
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              12-Hour Refund Window Control
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Instant QR &amp; Online Links
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: CLEAN WHITE AUTH FORM */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 xl:px-16 bg-white">
        <div className="w-full max-w-[420px] mx-auto">
          {/* Mobile-only top logo */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <Link to="/" className="no-underline">
              <BrandLogo size={30} />
            </Link>
            <Link to="/events" className="text-xs font-semibold text-brand-600 no-underline">
              Browse events
            </Link>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-1">
            {mode === "register" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            {mode === "register"
              ? "Start selling escrow-protected tickets in minutes."
              : "Sign in to manage your events, attendees, and payouts."}
          </p>

          {/* Quick Attendee Ticket Lookup Shortcut (Replaces fake OAuth) */}
          <Link
            to="/find-tickets"
            className="w-full flex items-center justify-center gap-2.5 rounded-[6px] border border-brand-100 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline shadow-sm hover:bg-brand-50 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F4FD8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              <path d="M13 5v2" />
              <path d="M13 17v2" />
              <path d="M13 11v2" />
            </svg>
            <span>Bought a ticket? Find my tickets without an account</span>
          </Link>

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-3 text-xs text-slate-400 font-medium">or organiser email</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="auth-name">
                  Full name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                placeholder="you@example.com"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                autoComplete="email"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="auth-phone">
                  Phone
                </label>
                <input
                  id="auth-phone"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={f.phone}
                  onChange={(e) => setF({ ...f, phone: e.target.value })}
                  autoComplete="tel"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="auth-pass">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-pass"
                  type={showPass ? "text" : "password"}
                  required
                  minLength={mode === "register" ? 8 : 1}
                  placeholder={mode === "register" ? "8+ chars, with a letter and a number" : "Enter your password"}
                  value={f.password}
                  onChange={(e) => setF({ ...f, password: e.target.value })}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink bg-transparent border-0 p-1 cursor-pointer"
                >
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {err && <Notice kind="error">{err}</Notice>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-[6px] bg-ink hover:bg-brand-700 text-white font-semibold py-3 px-4 text-sm transition cursor-pointer border-0 disabled:opacity-50"
            >
              {busy
                ? "Please wait..."
                : mode === "register"
                ? "Create account"
                : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === "register" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setErr(""); }}
                  className="font-bold text-ink hover:text-brand-600 bg-transparent border-0 p-0 cursor-pointer"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Need an organiser account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("register"); setErr(""); }}
                  className="font-bold text-ink hover:text-brand-600 bg-transparent border-0 p-0 cursor-pointer"
                >
                  Create account
                </button>
              </>
            )}
          </p>

          <p className="text-center text-xs text-slate-400 mt-6 leading-normal">
            By continuing you agree to the{" "}
            <Link to="/terms" className="underline text-slate-500 hover:text-ink">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline text-slate-500 hover:text-ink">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}