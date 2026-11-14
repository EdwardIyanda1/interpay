import { useEffect, useState } from "react";
import {
  MedicalServiceItem,
  PatientPassBooking,
  addMedicalService,
  getMedicalServices,
  getPatientBookings,
  updateBookingStatus,
} from "../clinicalStore";
import { formatNairaFromKobo } from "../ipg";

export default function DoctorConsolePage() {
  const [bookings, setBookings] = useState<PatientPassBooking[]>(getPatientBookings);
  const [services, setServices] = useState<MedicalServiceItem[]>(getMedicalServices);
  const [tab, setTab] = useState<"QUEUE" | "ADD_SERVICE">("QUEUE");

  const [form, setForm] = useState({
    kind: "CONSULTATION" as MedicalServiceItem["kind"],
    title: "",
    specialty: "Cardiology",
    doctorOrUnit: "",
    hospitalName: "Ekiti State Teaching Hospital",
    locationOrPlatform: "Wing B Consultation Suite",
    mode: "HYBRID" as MedicalServiceItem["mode"],
    feeNaira: "2500",
    turnaroundOrDuration: "30 mins consult",
    availableSlots: "20",
    description: "",
  });

  useEffect(() => {
    const sync = () => {
      setBookings(getPatientBookings());
      setServices(getMedicalServices());
    };
    window.addEventListener("clinical-store-updated", sync);
    return () => window.removeEventListener("clinical-store-updated", sync);
  }, []);

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    addMedicalService({
      kind: form.kind,
      title: form.title,
      specialty: form.specialty,
      doctorOrUnit: form.doctorOrUnit,
      hospitalName: form.hospitalName,
      locationOrPlatform: form.locationOrPlatform,
      mode: form.mode,
      feeKobo: Math.round(Number(form.feeNaira) * 100),
      turnaroundOrDuration: form.turnaroundOrDuration,
      availableSlots: Number(form.availableSlots) || 20,
      description: form.description,
    });
    setTab("QUEUE");
  };

  return (
    <main className="container-med py-10 space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="badge mb-2">Hospital &amp; Clinician Workspace</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1B3F] m-0">
            Live Patient Triage Queue &amp; IPG Revenue
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("QUEUE")}
            className={`btn small ${tab === "QUEUE" ? "" : "ghost"}`}
          >
            Patient Queue ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("ADD_SERVICE")}
            className={`btn small ${tab === "ADD_SERVICE" ? "" : "ghost"}`}
          >
            + Add Clinical Service
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="panel p-4">
          <span className="text-xs text-slate-500">Patients Booked</span>
          <strong className="block text-2xl font-bold text-[#0B1B3F] mt-1">{bookings.length}</strong>
        </div>
        <div className="panel p-4">
          <span className="text-xs text-slate-500">Admitted at Triage</span>
          <strong className="block text-2xl font-bold text-[#16794C] mt-1">
            {bookings.filter((b) => b.status !== "CONFIRMED").length}
          </strong>
        </div>
        <div className="panel p-4">
          <span className="text-xs text-slate-500">IPG Verified Revenue</span>
          <strong className="block text-2xl font-bold text-[#1F4FD8] mt-1">
            {formatNairaFromKobo(bookings.reduce((a, b) => a + b.amountPaidKobo, 0))}
          </strong>
        </div>
        <div className="panel p-4">
          <span className="text-xs text-slate-500">Active Services</span>
          <strong className="block text-2xl font-bold text-[#0B1B3F] mt-1">{services.length}</strong>
        </div>
      </div>

      {tab === "QUEUE" ? (
        <section className="panel space-y-4">
          <h2 className="text-lg font-bold text-[#0B1B3F] m-0">Incoming Patient Queue</h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-slate-500">
              No patient bookings recorded yet. Complete a test or live ₦10 checkout to see the patient appear here with their AI triage notes.
            </p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm text-[#0B1B3F]">{b.patientName}</strong>
                      <span className="badge">{b.passCode}</span>
                      <span className="badge green">{b.status}</span>
                      {b.urgency && <span className="badge amber">{b.urgency}</span>}
                    </div>
                    <div className="text-xs text-slate-600">
                      <strong>Service:</strong> {b.serviceTitle} ({b.appointmentSlot})
                    </div>
                    {b.triageSummary && (
                      <div className="text-xs text-slate-500">
                        <strong>AI Triage Summary:</strong> {b.triageSummary}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {b.status === "CONFIRMED" && (
                      <button
                        type="button"
                        onClick={() => updateBookingStatus(b.id, "CHECKED_IN")}
                        className="btn emerald small"
                      >
                        Admit Patient (QR Scan)
                      </button>
                    )}
                    {b.status === "CHECKED_IN" && (
                      <button
                        type="button"
                        onClick={() => updateBookingStatus(b.id, "COMPLETED")}
                        className="btn small"
                      >
                        Mark Consult Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <form onSubmit={handleCreateService} className="panel space-y-4 max-w-2xl">
          <h2 className="text-lg font-bold text-[#0B1B3F] m-0">Publish a New Clinical Service or Lab Panel</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-[#0B1B3F]">
              Service Title
              <input
                required
                placeholder="e.g. Maternal Ultrasound & Antenatal Review"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-semibold text-[#0B1B3F]">
              Specialty
              <input
                required
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                className="mt-1"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-[#0B1B3F]">
              Attending Doctor or Lab Unit
              <input
                required
                placeholder="Dr. Moyinoluwa Popoola"
                value={form.doctorOrUnit}
                onChange={(e) => setForm({ ...form, doctorOrUnit: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-semibold text-[#0B1B3F]">
              Fee in Naira (₦)
              <input
                required
                inputMode="numeric"
                value={form.feeNaira}
                onChange={(e) => setForm({ ...form, feeNaira: e.target.value })}
                className="mt-1"
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-[#0B1B3F]">
            Clinical Description &amp; Patient Instructions
            <textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1"
            />
          </label>

          <button type="submit" className="btn">
            Publish Clinical Service &rarr;
          </button>
        </form>
      )}
    </main>
  );
}