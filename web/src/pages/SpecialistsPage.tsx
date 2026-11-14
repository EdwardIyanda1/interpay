import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMedicalServices } from "../clinicalStore";
import { formatNairaFromKobo, getIpgSettings } from "../ipg";

export default function SpecialistsPage() {
  const services = getMedicalServices();
  const ipg = getIpgSettings();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (kindFilter !== "ALL" && s.kind !== kindFilter) return false;
      const q = search.trim().toLowerCase();
      if (
        q &&
        !`${s.title} ${s.specialty} ${s.doctorOrUnit} ${s.hospitalName}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [services, search, kindFilter]);

  return (
    <main className="container-med py-10 space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="badge mb-2">Verified Healthcare Directory</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1B3F] m-0">
            Specialists, Diagnostic Labs &amp; Health Outreaches
          </h1>
          <p className="text-sm text-slate-500 m-0 mt-1">
            Select a consultation or lab screening to book and pay instantly via Interswitch Webpay.
          </p>
        </div>
        <Link to="/triage" className="btn emerald small">
          Not sure? Use AI Triage &rarr;
        </Link>
      </div>

      <div className="panel p-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <input
          type="search"
          placeholder="Search by specialty, doctor, lab test, or hospital..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2 flex-wrap">
          {(
            [
              ["ALL", "All Services"],
              ["CONSULTATION", "Specialist Consults"],
              ["LAB_PANEL", "Diagnostic Labs"],
              ["OUTREACH", "Community Outreaches"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKindFilter(id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition ${
                kindFilter === id
                  ? "bg-[#1F4FD8] text-white border-[#1F4FD8]"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((srv) => (
          <article key={srv.id} className="panel flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="badge">{srv.specialty}</span>
                <span className="badge green">{srv.kind.replace("_", " ")}</span>
              </div>
              <h2 className="text-base font-bold text-[#0B1B3F] m-0">{srv.title}</h2>
              <p className="text-xs text-slate-600 m-0 leading-relaxed">{srv.description}</p>
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <div>
                  <strong className="text-[#0B1B3F]">Clinician / Unit:</strong> {srv.doctorOrUnit}
                </div>
                <div>
                  <strong className="text-[#0B1B3F]">Hospital:</strong> {srv.hospitalName}
                </div>
                <div>
                  <strong className="text-[#0B1B3F]">Location:</strong> {srv.locationOrPlatform}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400">
                  {ipg.demoTenNairaOverride ? "Live Demo Fee" : "Consultation Fee"}
                </span>
                <strong className="text-base font-bold text-[#1F4FD8]">
                  {ipg.demoTenNairaOverride ? "₦10.00" : formatNairaFromKobo(srv.feeKobo)}
                </strong>
              </div>
              <Link to={`/checkout/${srv.id}`} className="btn small">
                Book with IPG &rarr;
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}