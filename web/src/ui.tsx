import { useState } from "react";
import { Link } from "react-router-dom";
import { clamp } from "@shared";

export function BrandLogo({ size = 34, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src="/favicon.svg"
        alt="InterPay logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="block shrink-0"
      />
      <span className="font-bold text-xl tracking-tight">
        <span className={dark ? "text-white" : "text-ink"}>Inter</span>
        <span className={dark ? "text-sky-400" : "text-brand-600"}>Pay</span>
      </span>
    </span>
  );
}

const CATEGORY_PHOTOS: Record<string, string> = {
  tech: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=80",
  community: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80",
  campus: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=80",
  business: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=900&q=80",
  health: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80",
  agriculture: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=900&q=80",
  arts: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
  faith: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80",
  sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80",
};

export function CategoryArt({ category }: { category: string }) {
  const cat = (category || "community").toLowerCase();
  const photo = CATEGORY_PHOTOS[cat] ?? CATEGORY_PHOTOS.tech;
  return (
    <div className="pic relative overflow-hidden aspect-video w-full bg-ink" aria-hidden="true">
      <img src={photo} alt="" className="w-full h-full object-cover block" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/15 to-ink/75" />
      <span className="absolute bottom-2.5 left-3 bg-white border border-brand-100 text-ink text-xs font-bold px-2.5 py-0.5 rounded capitalize">
        {cat}
      </span>
    </div>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const commit = (raw: string) => {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    onChange(clamp(Number.isNaN(n) ? min : n, min, max));
    setText(null);
  };
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="btn ghost small"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        -
      </button>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={`${label} quantity`}
        value={text ?? String(value)}
        onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit((e.target as HTMLInputElement).value))}
      />
      <button
        type="button"
        className="btn ghost small"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export const Notice = ({
  kind = "info",
  children,
}: {
  kind?: "info" | "error" | "ok";
  children: React.ReactNode;
}) => (
  <div className={`notice ${kind}`} role={kind === "error" ? "alert" : "status"}>
    {children}
  </div>
);

export const Badge = ({ children }: { children: React.ReactNode }) => <span className="badge">{children}</span>;

export const MODE_LABEL: Record<string, string> = {
  PHYSICAL: "In person",
  ONLINE: "Online",
  BOTH: "In person and online",
};

/* ============================================================================
   TACHPAE-STYLE SIDEBAR WORKSPACE SHELL (Used by Organiser, ManageEvent, Admin)
   ============================================================================ */
export type NavItem = {
  id: string;
  label: string;
  icon: "grid" | "calendar" | "ticket" | "users" | "wallet" | "shield" | "mail" | "settings" | "audit";
  badge?: string | number;
};

function SidebarIcon({ name }: { name: NavItem["icon"] }) {
  switch (name) {
    case "grid":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "calendar":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "ticket":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M13 5v2" />
          <path d="M13 17v2" />
          <path d="M13 11v2" />
        </svg>
      );
    case "users":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "wallet":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 18V6" />
        </svg>
      );
    case "shield":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "mail":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case "audit":
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    default:
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}

export function WorkspaceShell({
  user,
  onSignOut,
  title,
  subtitle,
  navItems,
  activeId,
  onSelect,
  primaryAction,
  period,
  onPeriodChange,
  children,
}: {
  user: { name: string; email: string; role: string };
  onSignOut: () => void;
  title: string;
  subtitle: string;
  navItems: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  primaryAction?: { label: string; onClick: () => void };
  period?: string;
  onPeriodChange?: (p: string) => void;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const displayName = user.name || user.email.split("@")[0] || "Organiser";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const orgInitials = `${displayName[0] ?? "E"}O`.toUpperCase();

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-[#F8FAFC] text-ink">
      {/* LEFT SIDEBAR (TACHPAE DASHBOARD STYLE) */}
      <aside className="w-full lg:w-[248px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between lg:sticky lg:top-0 lg:h-dvh z-30">
        <div className="p-4 space-y-4">
          {/* Brand Header + Mobile Drawer Toggle */}
          <div className="flex items-center justify-between">
            <Link to="/" className="no-underline">
              <BrandLogo size={30} />
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden rounded-[6px] border border-slate-200 p-2 text-ink bg-white cursor-pointer"
              aria-label="Toggle workspace menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>

          {/* Organization Pill */}
          <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 border border-slate-200/80 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0">
              {orgInitials}
            </div>
            <div className="min-w-0 leading-tight">
              <strong className="block text-xs text-ink truncate">{displayName}&apos;s Organization</strong>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {user.role === "admin" ? "PLATFORM ADMIN" : "ORGANIZATION"}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav
            aria-label="Workspace"
            className={`${mobileNavOpen ? "grid" : "hidden"} lg:grid gap-1 pt-1`}
          >
            {navItems.map((item) => {
              const active = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-[13px] font-semibold text-left border-0 cursor-pointer transition ${
                    active
                      ? "bg-brand-50 text-brand-600"
                      : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-ink"
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <SidebarIcon name={item.icon} />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span className="rounded-full bg-white border border-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Utility Links & User Profile Footer */}
        <div className={`${mobileNavOpen ? "block" : "hidden"} lg:block border-t border-slate-200 p-4 space-y-3`}>
          <div className="grid gap-1 text-xs font-medium">
            <Link
              to="/events"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-ink no-underline"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>Browse public events</span>
            </Link>
            <Link
              to="/find-tickets"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-ink no-underline"
            >
              <SidebarIcon name="ticket" />
              <span>Find my tickets</span>
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0 leading-tight">
                <strong className="block text-xs text-ink truncate">{displayName}</strong>
                <span className="block text-[11px] text-slate-400 truncate">{user.email}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 rounded-md text-slate-400 hover:text-danger hover:bg-red-50 bg-transparent border-0 cursor-pointer shrink-0"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT WORKSPACE MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Action & Filter Bar */}
        <header className="bg-white border-b border-slate-200 px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-ink m-0">{title}</h1>
            <p className="text-xs text-slate-500 m-0 mt-0.5">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="btn small"
              >
                {primaryAction.label}
              </button>
            )}

            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 rounded-[6px] border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-ink no-underline"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>Browse events</span>
            </Link>

            {/* Date Filter Pills (Today / This week / Month / All) */}
            {period && onPeriodChange && (
              <div className="hidden sm:inline-flex items-center rounded-[6px] bg-slate-100 p-0.5 border border-slate-200/80 text-xs font-semibold">
                {(["Today", "This week", "Month", "All"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPeriodChange(p)}
                    className={`px-2.5 py-1 rounded-[5px] border-0 cursor-pointer transition ${
                      period === p ? "bg-brand-50 text-brand-600 font-bold shadow-2xs" : "bg-transparent text-slate-600 hover:text-ink"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Main Content Body */}
        <div className="p-5 sm:p-8 max-w-[1120px] w-full mx-auto space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}