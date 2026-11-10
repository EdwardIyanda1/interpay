import { createContext, useContext, useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, getToken, setToken } from "./api";
import { BrandLogo } from "./ui";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventPage from "./pages/EventPage";
import TicketPage from "./pages/TicketPage";
import FindTickets from "./pages/FindTickets";
import Login from "./pages/Login";
import Organiser from "./pages/Organiser";
import ManageEvent from "./pages/ManageEvent";
import Admin from "./pages/Admin";
import { Terms, Privacy } from "./pages/Legal";
import NotFound from "./pages/NotFound";

export type User = { id: number; email: string; name: string; role: "organiser" | "admin"; approved: boolean };
type Auth = { user: User | null; ready: boolean; signIn: (token: string, u: User) => void; signOut: () => void };
const AuthCtx = createContext<Auth>({ user: null, ready: false, signIn: () => {}, signOut: () => {} });
export const useAuth = () => useContext(AuthCtx);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!getToken()) return setReady(true);
    api<User>("/api/auth/me").then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    if (location.hash) {
      const id = location.hash.slice(1);
      const timer = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [location.pathname, location.hash]);

  const auth: Auth = {
    user,
    ready,
    signIn: (t, u) => { setToken(t); setUser(u); },
    signOut: () => { setToken(null); setUser(null); setMenuOpen(false); nav("/"); },
  };

  // Full-bleed layouts that manage their own sidebar or split-screen shell
  const isCustomShell =
    location.pathname === "/login" ||
    location.pathname.startsWith("/organiser") ||
    location.pathname.startsWith("/admin");

  const isDarkHero = location.pathname === "/";
  const dashboardPath = user?.role === "admin" ? "/admin" : "/organiser";
  const dashboardLabel = user?.role === "admin" ? "Admin Console" : "Dashboard";

  return (
    <AuthCtx.Provider value={auth}>
      <div className="min-h-dvh flex flex-col bg-white text-ink">
        {!isCustomShell && (
          <header
            className={`sticky top-0 z-50 border-b transition ${
              isDarkHero
                ? "bg-[#061026]/95 border-white/10 text-white backdrop-blur-md"
                : "bg-white/95 border-brand-100 text-ink backdrop-blur-md"
            }`}
          >
            <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
              <Link to="/" className="no-underline inline-flex items-center gap-2" aria-label="InterPay home">
                <BrandLogo size={32} dark={isDarkHero} />
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-7 text-sm font-semibold" aria-label="Main">
                <Link
                  to="/events"
                  className={`no-underline transition ${
                    isDarkHero ? "text-slate-200 hover:text-white" : "text-ink hover:text-brand-600"
                  }`}
                >
                  Browse events
                </Link>
                <Link
                  to="/#how"
                  className={`no-underline transition ${
                    isDarkHero ? "text-slate-200 hover:text-white" : "text-ink hover:text-brand-600"
                  }`}
                >
                  How it works
                </Link>
                <Link
                  to="/find-tickets"
                  className={`no-underline transition ${
                    isDarkHero ? "text-slate-200 hover:text-white" : "text-ink hover:text-brand-600"
                  }`}
                >
                  Find my tickets
                </Link>
              </nav>

              {/* Desktop Right Actions */}
              <div className="hidden md:flex items-center gap-2.5">
                {user ? (
                  <>
                    <Link to={dashboardPath} className="btn small">
                      {dashboardLabel}
                    </Link>
                    <button className="btn ghost small" onClick={auth.signOut}>
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className={`text-sm font-semibold px-3 py-1.5 no-underline ${
                        isDarkHero ? "text-slate-200 hover:text-white" : "text-ink hover:text-brand-600"
                      }`}
                    >
                      Sign in
                    </Link>
                    <Link to="/login?mode=register" className="btn small">
                      Create event
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
                className={`md:hidden inline-flex items-center justify-center w-10 h-10 rounded-[6px] border bg-transparent cursor-pointer ${
                  isDarkHero ? "border-white/20 text-white" : "border-brand-100 text-ink"
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  {menuOpen ? (
                    <>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </>
                  ) : (
                    <>
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                  )}
                </svg>
              </button>
            </div>

            {/* Mobile Dropdown Drawer */}
            {menuOpen && (
              <div className="md:hidden bg-white text-ink border-b-2 border-brand-600 px-4 py-5 space-y-3 shadow-xl">
                <div className="grid gap-2">
                  <Link to="/events" className="block px-3 py-2.5 rounded-[6px] border border-brand-100 font-semibold text-sm text-ink no-underline">
                    Browse events
                  </Link>
                  <Link to="/#how" className="block px-3 py-2.5 rounded-[6px] border border-brand-100 font-semibold text-sm text-ink no-underline">
                    How escrow works
                  </Link>
                  <Link to="/find-tickets" className="block px-3 py-2.5 rounded-[6px] border border-brand-100 font-semibold text-sm text-ink no-underline">
                    Find my tickets
                  </Link>
                  {user ? (
                    <>
                      <Link to={dashboardPath} className="btn w-full">
                        {dashboardLabel}
                      </Link>
                      <button className="btn ghost w-full" onClick={auth.signOut}>
                        Sign out
                      </button>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Link to="/login" className="btn ghost">
                        Sign in
                      </Link>
                      <Link to="/login?mode=register" className="btn">
                        Create account
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </header>
        )}

        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/event/:slug/:year" element={<EventPage />} />
            <Route path="/tickets/:token" element={<TicketPage />} />
            <Route path="/find-tickets" element={<FindTickets />} />
            <Route path="/login" element={<Login />} />
            <Route path="/organiser" element={<Organiser />} />
            <Route path="/organiser/events/:id" element={<ManageEvent />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        {!isCustomShell && (
          <footer className="border-t border-brand-100 bg-[#F8FAFF] py-10 px-4 sm:px-6 text-xs text-slate-500">
            <div className="max-w-[1160px] mx-auto flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BrandLogo size={24} />
                <span>InterPay is a hackathon project built on the Interswitch Payment Gateway. It is not an official Interswitch product.</span>
              </div>
              <nav className="flex flex-wrap gap-5 font-semibold">
                <Link to="/events" className="text-slate-600 hover:text-brand-600 no-underline">Events</Link>
                <Link to="/find-tickets" className="text-slate-600 hover:text-brand-600 no-underline">Find my tickets</Link>
                <Link to="/terms" className="text-slate-600 hover:text-brand-600 no-underline">Terms</Link>
                <Link to="/privacy" className="text-slate-600 hover:text-brand-600 no-underline">Privacy Policy</Link>
              </nav>
            </div>
          </footer>
        )}
      </div>
    </AuthCtx.Provider>
  );
}