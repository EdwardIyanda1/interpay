import { createContext, useContext, useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { api, getToken, setToken } from "./api";
import { BrandLogo } from "./ui";
import Home from "./pages/Home";
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
  const nav = useNavigate();

  useEffect(() => {
    if (!getToken()) return setReady(true);
    api<User>("/api/auth/me").then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  const auth: Auth = {
    user,
    ready,
    signIn: (t, u) => { setToken(t); setUser(u); },
    signOut: () => { setToken(null); setUser(null); nav("/"); },
  };

  return (
    <AuthCtx.Provider value={auth}>
      <header className="site-header">
        <div className="bar">
          <Link to="/" className="logo" aria-label="InterPay home">
            <BrandLogo size={34} />
          </Link>
          <nav aria-label="Main">
            <Link to="/#events">Events</Link>
            <Link to="/#how">How it works</Link>
            <Link to="/find-tickets">Find my tickets</Link>
            {user ? (
              <>
                <Link to={user.role === "admin" ? "/admin" : "/organiser"}>
                  {user.role === "admin" ? "Admin" : "My events"}
                </Link>
                <button className="btn ghost small" onClick={auth.signOut}>Sign out</button>
              </>
            ) : (
              <Link className="btn small" to="/login">Organiser sign in</Link>
            )}
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
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

      <footer className="site-footer">
        <div className="inner footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo">
              <BrandLogo size={28} />
            </Link>
            <p className="muted small" style={{ margin: "8px 0 0", maxWidth: 460 }}>
              Event registration with escrow protection and automated payouts. Built on the Interswitch Payment Gateway.
            </p>
          </div>
          <nav aria-label="Footer" className="footer-links">
            <Link to="/terms">Terms and Conditions</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/find-tickets">Find my tickets</Link>
            <Link to="/login">Organiser portal</Link>
          </nav>
        </div>
        <div className="inner footer-legal">
          <span>InterPay is a hackathon project built on the Interswitch Payment Gateway. It is not an official Interswitch product.</span>
        </div>
      </footer>
    </AuthCtx.Provider>
  );
}