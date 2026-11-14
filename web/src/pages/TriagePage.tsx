import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AiTriageReport,
  QUICK_SYMPTOM_PRESETS,
  evaluatePatientTriage,
  getLastTriageReport,
  getMedicalServices,
} from "../clinicalStore";
import { formatNairaFromKobo, getIpgSettings } from "../ipg";

export default function TriagePage() {
  const existing = getLastTriageReport();
  const [patientName, setPatientName] = useState(existing?.patientName || "Edward Iyanda");
  const [ageGroup, setAgeGroup] = useState(existing?.ageGroup || "Adult (18-59 yrs)");
  const [symptoms, setSymptoms] = useState(
    existing?.symptoms || QUICK_SYMPTOM_PRESETS[0].symptoms
  );
  const [duration, setDuration] = useState(existing?.duration || "1-3 days");
  const [temperatureC, setTemperatureC] = useState(existing?.temperatureC || "38.4");
  const [systolicBp, setSystolicBp] = useState(existing?.systolicBp || "124/82");
  const [report, setReport] = useState<AiTriageReport | null>(() =>
    existing ??
    evaluatePatientTriage({
      patientName: "Edward Iyanda",
      ageGroup: "Adult (18-59 yrs)",
      symptoms: QUICK_SYMPTOM_PRESETS[0].symptoms,
      duration: "1-3 days",
      temperatureC: "38.4",
      systolicBp: "124/82",
    })
  );

  const services = getMedicalServices();
  const ipg = getIpgSettings();
  const matchedService =
    services.find((s) => s.id === report?.recommendedServiceId) ?? services[0];

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const res = evaluatePatientTriage({
      patientName,
      ageGroup,
      symptoms,
      duration,
      temperatureC,
      systolicBp,
    });
    setReport(res);
  };

  return (
    <main className="container-med py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="badge green mb-2">Emerging Technology: Clinical AI</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1B3F] m-0">
            AI Symptom &amp; Vitals Triage Studio
          </h1>
          <p className="text-sm text-slate-500 m-0 mt-1 max-w-2xl">
            Enter patient symptoms and baseline vitals. CareSwitch AI classifies clinical urgency, generates pre-visit preparation steps, and links directly to Interswitch Webpay booking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-7 items-start">
        {/* LEFT: SYMPTOM & VITALS INPUT FORM */}
        <form onSubmit={handleAnalyze} className="panel space-y-4">
          <h2 className="text-lg font-bold text-[#0B1B3F] m-0">1. Patient Symptoms &amp; Vitals</h2>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_SYMPTOM_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setSymptoms(p.symptoms);
                  setTemperatureC(p.temp);
                  setSystolicBp(p.bp);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 hover:border-[#1F4FD8] hover:text-[#1F4FD8] px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer transition"
              >
                + {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-[#0B1B3F]">
              Patient Full Name
              <input
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-semibold text-[#0B1B3F]">
              Age Group
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="mt-1"
              >
                <option>Child (0-12 yrs)</option>
                <option>Teen (13-17 yrs)</option>
                <option>Adult (18-59 yrs)</option>
                <option>Senior (60+ yrs)</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold text-[#0B1B3F]">
            Describe Symptoms &amp; Chief Complaint
            <textarea
              rows={3}
              required
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="mt-1"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block text-xs font-semibold text-[#0B1B3F]">
              Duration
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1">
                <option>Under 24 hours</option>
                <option>1-3 days</option>
                <option>4-7 days</option>
                <option>Over 1 week</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-[#0B1B3F]">
              Temperature (°C)
              <input
                type="text"
                placeholder="37.2"
                value={temperatureC}
                onChange={(e) => setTemperatureC(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-semibold text-[#0B1B3F]">
              BP (mmHg)
              <input
                type="text"
                placeholder="120/80"
                value={systolicBp}
                onChange={(e) => setSystolicBp(e.target.value)}
                className="mt-1"
              />
            </label>
          </div>

          <button type="submit" className="btn emerald w-full py-3">
            Run AI Clinical Assessment &rarr;
          </button>
        </form>

        {/* RIGHT: AI CLINICAL ASSESSMENT OUTPUT + RECOMMENDED SERVICE */}
        {report && (
          <div className="space-y-5">
            <section className="panel border-2 border-[#1F4FD8] space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#16794C] block">
                    AI TRIAGE REPORT &bull; {report.confidence}% MATCH CONFIDENCE
                  </span>
                  <h2 className="text-xl font-bold text-[#0B1B3F] m-0 mt-0.5">
                    Recommended Department: {report.recommendedSpecialty}
                  </h2>
                </div>
                <span className="badge amber">{report.urgency}</span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 m-0 leading-relaxed">
                {report.clinicalReasoning}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                  <strong className="block text-xs text-[#0B1B3F] mb-1.5">
                    Suggested Diagnostic Workup
                  </strong>
                  <ul className="pl-4 m-0 space-y-1 text-xs text-slate-600">
                    {report.suggestedLabTests.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-3.5">
                  <strong className="block text-xs text-[#16794C] mb-1.5">
                    Patient Preparation Steps
                  </strong>
                  <ul className="pl-4 m-0 space-y-1 text-xs text-slate-700">
                    {report.prepSteps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {report.redFlags.length > 0 && (
                <div className="rounded-xl bg-red-50/70 border border-red-200 px-3.5 py-2.5 text-xs text-[#B42318]">
                  <strong>Clinical Safety Note:</strong> {report.redFlags[0]}
                </div>
              )}

              {/* Matched Clinical Service Card */}
              <div className="rounded-xl bg-[#EEF3FF] border border-[#D9E2F7] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#173DB0] block">
                    MATCHED HOSPITAL SERVICE
                  </span>
                  <strong className="text-sm text-[#0B1B3F] block mt-0.5">
                    {matchedService.title}
                  </strong>
                  <span className="text-xs text-slate-600 block">
                    {matchedService.doctorOrUnit} &bull; {matchedService.hospitalName}
                  </span>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <strong className="text-base text-[#1F4FD8]">
                    {ipg.demoTenNairaOverride ? "₦10.00 (Demo)" : formatNairaFromKobo(matchedService.feeKobo)}
                  </strong>
                  <Link to={`/checkout/${matchedService.id}`} className="btn small">
                    Proceed to IPG Checkout &rarr;
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}