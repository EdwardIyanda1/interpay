import { useState } from "react";
import { clamp } from "@shared";

export function BrandLogo({ size = 34, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span className="brand-mark" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <img
        src="/favicon.svg"
        alt="InterPay logo"
        width={size}
        height={size}
        style={{ width: size, height: size, display: "block", flexShrink: 0 }}
      />
      <span className="brand-wordmark">
        <span className="brand-inter" style={dark ? { color: "#FFFFFF" } : undefined}>Inter</span>
        <span className="brand-pay" style={dark ? { color: "#60A5FA" } : undefined}>Pay</span>
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

/** High-resolution themed cover with fallback when an event has no uploaded flyer yet */
export function CategoryArt({ category }: { category: string }) {
  const cat = (category || "community").toLowerCase();
  const photo = CATEGORY_PHOTOS[cat] ?? CATEGORY_PHOTOS.tech;
  return (
    <div className="pic category-art" aria-hidden="true">
      <img src={photo} alt="" className="category-photo" loading="lazy" />
      <div className="category-overlay" />
      <span className="category-art-label">{cat}</span>
    </div>
  );
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  const [text, setText] = useState<string | null>(null);
  const commit = (raw: string) => {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    onChange(clamp(Number.isNaN(n) ? min : n, min, max));
    setText(null);
  };
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="btn ghost" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>-</button>
      <input
        inputMode="numeric" pattern="[0-9]*" aria-label={`${label} quantity`} value={text ?? String(value)}
        onChange={(e) => setText(e.target.value.replace(/\D/g, ""))} onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit((e.target as HTMLInputElement).value))}
      />
      <button type="button" className="btn ghost" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
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

export const Notice = ({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: React.ReactNode }) => (
  <div className={`notice ${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</div>
);

export const Badge = ({ children }: { children: React.ReactNode }) => <span className="badge">{children}</span>;

export const MODE_LABEL: Record<string, string> = { PHYSICAL: "In person", ONLINE: "Online", BOTH: "In person and online" };