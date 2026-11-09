import { useState } from "react";
import { clamp } from "@shared";

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
