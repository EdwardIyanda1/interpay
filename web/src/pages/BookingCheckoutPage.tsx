import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getLastTriageReport,
  getMedicalServices,
  savePatientBooking,
} from "../clinicalStore";
import {
  HACKATHON_TEAMS,
  formatNairaFromKobo,
  getIpgSettings,
  launchInterswitchCheckout,
} from "../ipg";

export default function BookingCheckoutPage() {
  const { serviceId } = useParams();
  const nav = useNavigate();

  const services = getMedicalServices();
  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const lastTriage = getLastTriageReport();
  const ipg = getIpgSettings();
  const team = HACKATHON_TEAMS.find((t) => t.teamNumber === ipg.teamNumber) ?? HACKATHON_TEAMS[0];

  const [patientName, setPatientName] = useState(lastTriage?.patientName || "Edward Iyanda");
  const [patientEmail, setPatientEmail] = useState("edward@careswitch.health");
  const [patientPhone, setPatientPhone] = useState("+234 800 000 0000");
  const [attendanceMode, setAttendanceMode] = useState<"IN_CLINIC" | "TELEMEDICINE">(
    service.mode === "TELEMEDICINE" ? "TELEMEDICINE" : "IN_CLINIC"
  );
  const [appointmentSlot, setAppointmentSlot] = useState("Tomorrow, 10:00 AM WAT");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const effectiveKobo = ipg.demoTenNairaOverride ? 1000 : service.feeKobo;

  const handlePayWithInterswitch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatusMsg("");
    try {
      await launchInterswitchCheckout({
        amountKobo: effectiveKobo,
        custName: patientName,
        custEmail: patientEmail,
        payItemName: service.title,
        onComplete: (response, txnRef, settingsUsed) => {
          setBusy(false);
          const respCode = String(response?.resp || response?.responseCode || "00");
          savePatientBooking({
            txnRef,
            ipgResponseCode: respCode,
            ipgMode: settingsUsed.mode,
            teamPayableUsed:
              settingsUsed.mode === "LIVE"
                ? `${team.teamLabel} (${team.payItemId})`
                : "Test Sandbox (9405967)",
            patientName,
            patientEmail,
            patientPhone,
            serviceId: service.id,
            serviceTitle: service.title,
            specialty: service.specialty,
            doctorOrUnit: service.doctorOrUnit,
            hospitalName: service.hospitalName,
            attendanceMode,
            amountPaidKobo: effectiveKobo,
            appointmentSlot,
            triageSummary: lastTriage?.clinicalReasoning,
            urgency: lastTriage?.urgency,
            status: "CONFIRMED",
          });
          nav("/passes");
        },
      });
    } catch (err: any) {
      setBusy(false);
      setStatusMsg(err.message || "Could not open Interswitch checkout.");
    }
  };

  return (
    <main className="container-med py-10 max-w-4xl space-y-6">
      <Link to="/specialists" className="text-xs font-semibold text-[#1F4FD8] no-underline hover:underline">
        &larr; Back to specialists &amp; diagnostic labs
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-7 items-start">
        {/* LEFT: PATIENT APPOINTMENT & INTERSWITCH CHECKOUT FORM */}
        <form onSubmit={handlePayWithInterswitch} className="panel space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F4FD8] block">
                PATIENT REGISTRATION &amp; PAYMENT
              </span>
              <h1 className="text-xl font-bold text-[#0B1B3F] m-0">Complete Your Clinical Booking</h1>
            </div>
            <span className="badge green">IPG {ipg.mode}</span>
          </div>

          {service.mode === "HYBRID" && (
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-[#0B1B3F]">Select Consultation Mode</span>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    ["IN_CLINIC", "In-Clinic Hospital Visit"],
                    ["TELEMEDICINE", "Telemedicine Video Call"],
                  ] as const
                ).map(([val, label]) => (
                  <label
                    key={val}
                    className={`rounded-xl border p-3 text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                      attendanceMode === val
                        ? "border-[#1F4FD8] bg-[#EEF3FF] text-[#173DB0]"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      checked={attendanceMode === val}
                      onChange={() => setAttendanceMode(val)}
                      style={{ width: "auto" }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              Preferred Time Slot
              <select
                value={appointmentSlot}
                onChange={(e) => setAppointmentSlot(e.target.value)}
                className="mt-1"
              >
                <option>Today, 2:30 PM WAT (Express Triage)</option>
                <option>Tomorrow, 9:00 AM WAT (Morning Clinic)</option>
                <option>Tomorrow, 11:30 AM WAT</option>
                <option>Friday, 10:00 AM WAT</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-[#0B1B3F]">
              Patient Email (for QR Pass &amp; Receipt)
              <input
                type="email"
                required
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-semibold text-[#0B1B3F]">
              Phone / WhatsApp Number
              <input
                type="tel"
                required
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="mt-1"
              />
            </label>
          </div>

          {lastTriage && (
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3.5 text-xs space-y-1">
              <strong className="text-[#16794C] block">
                ✓ AI Triage Notes Attached for Doctor ({lastTriage.urgency})
              </strong>
              <p className="text-slate-600 m-0">{lastTriage.clinicalReasoning}</p>
            </div>
          )}

          {statusMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-[#B42318]">
              {statusMsg}
            </div>
          )}

          <button type="submit" disabled={busy} className="btn btn-lg w-full">
            {busy
              ? "Launching Interswitch Webpay..."
              : `Pay ${formatNairaFromKobo(effectiveKobo)} with Interswitch IPG →`}
          </button>
        </form>

        {/* RIGHT: CLINICAL SUMMARY & IPG CREDENTIALS CARD */}
        <aside className="panel space-y-4 bg-[#F8FAFF]">
          <span className="badge">{service.specialty}</span>
          <h2 className="text-lg font-bold text-[#0B1B3F] m-0">{service.title}</h2>
          <p className="text-xs text-slate-600 m-0">{service.description}</p>

          <div className="border-y border-slate-200 py-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Clinician / Unit:</span>
              <strong className="text-[#0B1B3F] text-right">{service.doctorOrUnit}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Facility:</span>
              <strong className="text-[#0B1B3F] text-right">{service.hospitalName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">IPG Mode:</span>
              <strong className="text-[#16794C]">{ipg.mode} ENVIRONMENT</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Merchant Code:</span>
              <strong className="font-mono">{ipg.mode === "LIVE" ? "MX153376" : "MX6072"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pay Item ID:</span>
              <strong className="font-mono">
                {ipg.mode === "LIVE" ? `${team.payItemId} (${team.teamLabel})` : "9405967"}
              </strong>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-[#0B1B3F]">Total Payable</span>
            <strong className="text-2xl font-bold text-[#1F4FD8]">
              {formatNairaFromKobo(effectiveKobo)}
            </strong>
          </div>
          <p className="text-[11px] text-slate-500 m-0">
            Amount passed to Interswitch Webpay in minor denomination: <code>&quot;{effectiveKobo}&quot;</code> kobo.
          </p>
        </aside>
      </div>
    </main>
  );
}