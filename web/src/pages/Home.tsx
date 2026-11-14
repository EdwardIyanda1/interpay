import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  QUICK_SYMPTOM_PRESETS,
  evaluatePatientTriage,
  getMedicalServices,
} from "../clinicalStore";
import { formatNairaFromKobo, getIpgSettings } from "../ipg";

export default function Home() {
  const nav = useNavigate();
  const services = getMedicalServices();
  const ipg = getIpgSettings();

  const [quickSymptoms, setQuickSymptoms] = useState(QUICK_SYMPTOM_PRESETS[0].symptoms);
  const [quickTemp, setQuickTemp] = useState(QUICK_SYMPTOM_PRESETS[0].temp);
  const [quickBp, setQuickBp] = useState(QUICK_SYMPTOM_PRESETS[0].bp);

  const runInstantTriage = (e: React.FormEvent) => {
    e.preventDefault();
    evaluatePatientTriage({
      patientName: "Walk-in Patient",
      ageGroup: "Adult (18-59 yrs)",
      symptoms: quickSymptoms,
      duration: "1-3 days",
      temperatureC: quickTemp,
      systolicBp: quickBp,
    });
    nav("/triage");
  };

  return (
    <div>
      {/* DARK CLINICAL GRID HERO */}
      <section className="relative bg-[#061026] text-white overflow-hidden py-14 sm:py-20 border-b border-white/10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(31,79,216,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,79,216,0.15) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-[8%] top-[12%] w-96 h-96 rounded-full bg-[#1F4FD8]/35 blur-3xl"
          aria-hidden="true"
        />

        <div className="container-med relative z-10 grid grid-cols-1 lg:grid-cols-[1.12fr_0.88fr] gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 border border-emerald-400/30 px-3.5 py-1 text-xs font-semibold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              PHEARTS Track: Health + AI Triage + Interswitch Webpay
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-white leading-[1.08] tracking-tight m-0">
              AI clinical triage.
              <br />
              Instant{" "}
              <span className="text-emerald-400 underline decoration-emerald-400/60 decoration-4 underline-offset-8">
                Interswitch
              </span>
              <br />
              hospital booking.
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl m-0">
              Stop guessing which hospital queue to join. Describe your symptoms for an instant AI clinical triage assessment, match with the right specialist or diagnostic lab, and pay seamlessly via the Interswitch Payment Gateway (IPG).
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link to="/triage" className="btn emerald btn-lg">
                Launch AI Symptom Triage &rarr;
              </Link>
              <Link
                to="/specialists"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold px-5 py-3 text-sm no-underline transition"
              >
                Browse Specialists &amp; Labs
              </Link>
            </div>

            <div className="pt-2 flex flex-wrap gap-6 text-xs text-slate-400 font-medium">
              <span>✓ AI Pre-Consultation Triage Notes</span>
              <span>✓ Live &amp; Test IPG Inline Webpay</span>
              <span>✓ Instant QR Hospital &amp; Lab Pass</span>
            </div>
          </div>

          {/* RIGHT INTERACTIVE AI TRIAGE WIDGET CARD */}
          <div className="rounded-2xl border border-white/15 bg-[#0F1E3D]/95 backdrop-blur-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  LIVE AI TRIAGE ENGINE
                </span>
                <strong className="text-base text-white">Quick Symptom &amp; Vitals Check</strong>
              </div>
              <span className="rounded bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-sky-300">
                Instant Match
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_SYMPTOM_PRESETS.slice(0, 4).map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setQuickSymptoms(p.symptoms);
                    setQuickTemp(p.temp);
                    setQuickBp(p.bp);
                  }}
                  className="rounded-full bg-white/10 hover:bg-[#1F4FD8] text-slate-200 hover:text-white border border-white/10 px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition"
                >
                  + {p.label}
                </button>
              ))}
            </div>

            <form onSubmit={runInstantTriage} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Patient symptoms
                </label>
                <textarea
                  rows={3}
                  required
                  value={quickSymptoms}
                  onChange={(e) => setQuickSymptoms(e.target.value)}
                  className="bg-[#061026] text-white border-white/15 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Temp (°C) optional
                  </label>
                  <input
                    type="text"
                    placeholder="37.5"
                    value={quickTemp}
                    onChange={(e) => setQuickTemp(e.target.value)}
                    className="bg-[#061026] text-white border-white/15 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Blood Pressure (mmHg)
                  </label>
                  <input
                    type="text"
                    placeholder="120/80"
                    value={quickBp}
                    onChange={(e) => setQuickBp(e.target.value)}
                    className="bg-[#061026] text-white border-white/15 text-xs"
                  />
                </div>
              </div>

              <button type="submit" className="btn emerald w-full py-3">
                Analyze Symptoms &amp; Recommend Care &rarr;
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FEATURED SPECIALIST CLINICS & DIAGNOSTIC PANELS */}
      <main className="container-med py-12 space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-[#1F4FD8] mb-1">
              DIRECT INTERSWITCH WEBPAY BOOKING
            </span>
            <h2 className="text-2xl font-bold text-[#0B1B3F] m-0">
              Available Specialist Consultations &amp; Diagnostic Labs
            </h2>
          </div>
          <Link to="/specialists" className="btn ghost small">
            View all {services.length} clinical services &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((srv) => (
            <article key={srv.id} className="panel flex flex-col justify-between gap-4 hover:border-[#1F4FD8] transition">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="badge">{srv.specialty}</span>
                  <span className="badge green">
                    {srv.mode === "TELEMEDICINE"
                      ? "Telemedicine Video"
                      : srv.mode === "HYBRID"
                      ? "In-Clinic & Video"
                      : "In-Clinic Visit"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#0B1B3F] m-0 leading-snug">
                  {srv.title}
                </h3>

                <p className="text-xs text-slate-600 m-0 leading-relaxed">
                  {srv.description}
                </p>

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <div>
                    <strong className="text-[#0B1B3F]">Specialist / Unit:</strong> {srv.doctorOrUnit}
                  </div>
                  <div>
                    <strong className="text-[#0B1B3F]">Facility:</strong> {srv.hospitalName}
                  </div>
                  <div>
                    <strong className="text-[#0B1B3F]">Duration / Turnaround:</strong> {srv.turnaroundOrDuration}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">
                    {ipg.demoTenNairaOverride ? "Live Demo Fee (Override)" : "Standard Fee"}
                  </span>
                  <strong className="text-base font-bold text-[#1F4FD8]">
                    {ipg.demoTenNairaOverride
                      ? "₦10.00"
                      : formatNairaFromKobo(srv.feeKobo)}
                  </strong>
                </div>
                <Link to={`/checkout/${srv.id}`} className="btn small">
                  Book &amp; Pay with IPG &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}