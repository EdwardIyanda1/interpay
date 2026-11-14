import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import {
  HACKATHON_TEAMS,
  IpgMode,
  IpgRuntimeSettings,
  getIpgSettings,
  saveIpgSettings,
} from "./ipg";
import { getPatientBookings } from "./clinicalStore";
import Home from "./pages/Home";
import TriagePage from "./pages/TriagePage";
import SpecialistsPage from "./pages/SpecialistsPage";
import BookingCheckoutPage from "./pages/BookingCheckoutPage";
import PatientPassesPage from "./pages/PatientPassesPage";
import DoctorConsolePage from "./pages/DoctorConsolePage";

export function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/favicon.svg" alt="CareSwitch AI" className="w-8 h-8 block shrink-0" />
      <span className="font-bold text-xl tracking-tight">
        <span className={dark ? "text-white" : "text-[#0B1B3F]"}>CareSwitch</span>
        <span className={dark ? "text-emerald-400" : "text-[#1F4FD8]"}>AI</span>
      </span>
    </span>
  );
}

export default function App() {
  const location = useLocation();
  const [ipg, setIpg] = useState<IpgRuntimeSettings>(getIpgSettings);
  const [passCount, setPassCount] = useState<number>(() => getPatientBookings().length);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    const sync = () => {
      setIpg(getIpgSettings());
      setPassCount(getPatientBookings().length);
    };
    window.addEventListener("ipg-settings-changed", sync);
    window.addEventListener("clinical-store-updated", sync);
    return () => {
      window.removeEventListener("ipg-settings-changed", sync);
      window.removeEventListener("clinical-store-updated", sync);
    };
  }, []);

  const updateIpg = (patch: Partial<IpgRuntimeSettings>) => {
    const next = { ...ipg, ...patch };
    setIpg(next);
    saveIpgSettings(next);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* TOP INTERSWITCH IPG ENVIRONMENT & TEAM SELECTOR BAR (FOR LIVE DEMO JUDGES) */}
      <div className="bg-[#061026] text-slate-200 border-b border-white/10 text-xs">
        <div className="container-med py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-bold ${
                ipg.mode === "LIVE"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${ipg.mode === "LIVE" ? "bg-emerald-400" : "bg-amber-400"}`} />
              IPG {ipg.mode} MODE
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Merchant: <strong className="text-white">{ipg.mode === "LIVE" ? "MX153376" : "MX6072"}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300">
              <span>Gateway:</span>
              <select
                value={ipg.mode}
                onChange={(e) => updateIpg({ mode: e.target.value as IpgMode })}
                className="w-auto bg-[#0F1E3D] text-white border-white/20 py-1 px-2 text-xs rounded"
              >
                <option value="TEST">TEST (QA Sandbox)</option>
                <option value="LIVE">LIVE (Production MX153376)</option>
              </select>
            </label>

            {ipg.mode === "LIVE" && (
              <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300">
                <span>Payable:</span>
                <select
                  value={ipg.teamNumber}
                  onChange={(e) => updateIpg({ teamNumber: Number(e.target.value) })}
                  className="w-auto bg-[#0F1E3D] text-white border-white/20 py-1 px-2 text-xs rounded"
                >
                  {HACKATHON_TEAMS.map((t) => (
                    <option key={t.teamNumber} value={t.teamNumber}>
                      {t.teamLabel} ({t.payItemId})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 cursor-pointer">
              <input
                type="checkbox"
                checked={ipg.demoTenNairaOverride}
                onChange={(e) => updateIpg({ demoTenNairaOverride: e.target.checked })}
                style={{ width: "auto" }}
              />
              <span>₦10.00 Demo Price</span>
            </label>
          </div>
        </div>
      </div>

      {/* MAIN MEDICAL NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="container-med py-3.5 flex items-center justify-between gap-4">
          <Link to="/" className="no-underline">
            <BrandMark />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold" aria-label="Primary">
            <Link
              to="/"
              className={`no-underline transition ${isActive("/") ? "text-[#1F4FD8]" : "text-[#0B1B3F] hover:text-[#1F4FD8]"}`}
            >
              Overview
            </Link>
            <Link
              to="/triage"
              className={`no-underline transition inline-flex items-center gap-1.5 ${
                isActive("/triage") ? "text-[#16794C]" : "text-[#0B1B3F] hover:text-[#16794C]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#16794C]" />
              <span>AI Symptom Triage</span>
            </Link>
            <Link
              to="/specialists"
              className={`no-underline transition ${
                isActive("/specialists") ? "text-[#1F4FD8]" : "text-[#0B1B3F] hover:text-[#1F4FD8]"
              }`}
            >
              Specialists &amp; Labs
            </Link>
            <Link
              to="/passes"
              className={`no-underline transition inline-flex items-center gap-1.5 ${
                isActive("/passes") ? "text-[#1F4FD8]" : "text-[#0B1B3F] hover:text-[#1F4FD8]"
              }`}
            >
              <span>My Care Passes</span>
              {passCount > 0 && (
                <span className="rounded-full bg-[#EEF3FF] text-[#173DB0] border border-[#D9E2F7] px-2 py-0.5 text-xs font-bold">
                  {passCount}
                </span>
              )}
            </Link>
            <Link
              to="/doctor"
              className={`no-underline transition ${
                isActive("/doctor") ? "text-[#1F4FD8]" : "text-[#0B1B3F] hover:text-[#1F4FD8]"
              }`}
            >
              Hospital Console
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-2.5">
            <Link to="/triage" className="btn emerald small">
              Start AI Triage
            </Link>
            <Link to="/specialists" className="btn small">
              Book Consultation
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden rounded-lg border border-slate-200 p-2 text-[#0B1B3F] bg-white cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-b-2 border-[#1F4FD8] px-4 py-4 space-y-2 shadow-lg">
            <Link to="/" className="block px-3 py-2 rounded-lg font-semibold text-sm text-[#0B1B3F] no-underline hover:bg-slate-50">
              Overview
            </Link>
            <Link to="/triage" className="block px-3 py-2 rounded-lg font-semibold text-sm text-[#16794C] bg-emerald-50/60 no-underline">
              AI Symptom Triage Studio
            </Link>
            <Link to="/specialists" className="block px-3 py-2 rounded-lg font-semibold text-sm text-[#0B1B3F] no-underline hover:bg-slate-50">
              Specialists &amp; Lab Panels
            </Link>
            <Link to="/passes" className="block px-3 py-2 rounded-lg font-semibold text-sm text-[#0B1B3F] no-underline hover:bg-slate-50">
              My Care Passes ({passCount})
            </Link>
            <Link to="/doctor" className="block px-3 py-2 rounded-lg font-semibold text-sm text-[#0B1B3F] no-underline hover:bg-slate-50">
              Hospital &amp; Doctor Console
            </Link>
          </div>
        )}
      </header>

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/triage" element={<TriagePage />} />
          <Route path="/specialists" element={<SpecialistsPage />} />
          <Route path="/checkout/:serviceId" element={<BookingCheckoutPage />} />
          <Route path="/passes" element={<PatientPassesPage />} />
          <Route path="/doctor" element={<DoctorConsolePage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>

      <footer className="bg-white border-t border-slate-200 py-8 text-xs text-slate-500">
        <div className="container-med flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span>
              Built for the Interswitch Pan-African Discovery Series Hackathon (PHEARTS: Health, Payment &amp; AI).
            </span>
          </div>
          <div className="flex gap-4 font-semibold">
            <Link to="/triage" className="text-slate-600 hover:text-[#1F4FD8] no-underline">AI Triage</Link>
            <Link to="/specialists" className="text-slate-600 hover:text-[#1F4FD8] no-underline">Specialists</Link>
            <Link to="/passes" className="text-slate-600 hover:text-[#1F4FD8] no-underline">Care Passes</Link>
            <Link to="/doctor" className="text-slate-600 hover:text-[#1F4FD8] no-underline">Doctor Console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}