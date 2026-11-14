import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PatientPassBooking, getPatientBookings } from "../clinicalStore";
import { formatNairaFromKobo } from "../ipg";

export default function PatientPassesPage() {
  const [bookings, setBookings] = useState<PatientPassBooking[]>(getPatientBookings);

  useEffect(() => {
    const sync = () => setBookings(getPatientBookings());
    window.addEventListener("clinical-store-updated", sync);
    return () => window.removeEventListener("clinical-store-updated", sync);
  }, []);

  return (
    <main className="container-med py-10 max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="badge green mb-2">Verified Digital Hospital Passes</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1B3F] m-0">
            My QR Care Passes &amp; Lab Vouchers
          </h1>
          <p className="text-sm text-slate-500 m-0 mt-1">
            Present your QR code at the hospital triage desk or click your telemedicine video link.
          </p>
        </div>
        <Link to="/specialists" className="btn small">
          + Book another consultation
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="panel py-16 text-center space-y-3">
          <h2 className="text-lg font-bold text-[#0B1B3F] m-0">No active care passes yet</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Run an AI symptom triage or choose a specialist clinic to book your first consultation via Interswitch Webpay.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link to="/triage" className="btn emerald small">
              Start AI Triage
            </Link>
            <Link to="/specialists" className="btn ghost small">
              Browse Specialists
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <article
              key={b.id}
              className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm grid grid-cols-1 md:grid-cols-[220px_1fr]"
            >
              {/* Left Medical Pass Stub */}
              <div className="bg-[#0B1B3F] text-white p-5 flex flex-col justify-between border-b md:border-b-0 md:border-r border-dashed border-white/20">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    HOSPITAL PASS ID
                  </span>
                  <strong className="block text-xl font-mono tracking-wider mt-1">{b.passCode}</strong>
                  <span className="inline-block mt-2 rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                    IPG {b.ipgMode} &bull; {formatNairaFromKobo(b.amountPaidKobo)}
                  </span>
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 text-xs">
                  <strong className="block text-white truncate">{b.patientName}</strong>
                  <span className="block text-slate-400 text-[11px]">{b.appointmentSlot}</span>
                </div>
              </div>

              {/* Right Clinical Details & Simulated QR */}
              <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge">{b.specialty}</span>
                    <span className="badge green">{b.status}</span>
                    <span className="badge">
                      {b.attendanceMode === "TELEMEDICINE" ? "Telemedicine Link" : "In-Clinic QR"}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-[#0B1B3F] m-0">{b.serviceTitle}</h2>
                  <p className="text-xs text-slate-600 m-0">
                    <strong>Clinician:</strong> {b.doctorOrUnit} &bull; <strong>Facility:</strong> {b.hospitalName}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 m-0">
                    IPG Ref: {b.txnRef} &bull; Payable: {b.teamPayableUsed}
                  </p>

                  {b.triageSummary && (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-600">
                      <strong className="text-[#0B1B3F]">AI Triage Note:</strong> {b.triageSummary}
                    </div>
                  )}
                </div>

                {/* Crisp SVG QR Code */}
                <div className="w-28 h-28 rounded-xl border border-slate-200 p-2 bg-white shrink-0 grid place-items-center">
                  <svg viewBox="0 0 88 88" width="92" height="92" fill="none">
                    <rect width="88" height="88" rx="6" fill="#F8FAFC" />
                    <rect x="10" y="10" width="22" height="22" stroke="#0B1B3F" strokeWidth="4" />
                    <rect x="17" y="17" width="8" height="8" fill="#1F4FD8" />
                    <rect x="56" y="10" width="22" height="22" stroke="#0B1B3F" strokeWidth="4" />
                    <rect x="63" y="17" width="8" height="8" fill="#1F4FD8" />
                    <rect x="10" y="56" width="22" height="22" stroke="#0B1B3F" strokeWidth="4" />
                    <rect x="17" y="63" width="8" height="8" fill="#16794C" />
                    <rect x="40" y="14" width="8" height="16" fill="#0B1B3F" />
                    <rect x="40" y="40" width="12" height="12" fill="#1F4FD8" />
                    <rect x="58" y="42" width="18" height="8" fill="#0B1B3F" />
                    <rect x="42" y="62" width="14" height="14" fill="#16794C" />
                    <rect x="62" y="56" width="14" height="20" fill="#0B1B3F" />
                  </svg>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}