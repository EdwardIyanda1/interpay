export const naira = (kobo: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);

export const formatDateTime = (iso: string, tz = "Africa/Lagos") =>
  new Intl.DateTimeFormat("en-NG", { timeZone: tz, dateStyle: "full", timeStyle: "short" }).format(new Date(iso));

export const formatDate = (iso: string, tz = "Africa/Lagos") =>
  new Intl.DateTimeFormat("en-NG", { timeZone: tz, dateStyle: "medium" }).format(new Date(iso));

export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const parts = (ms: number, tz: string) => {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return Object.fromEntries(f.formatToParts(new Date(ms)).map((p) => [p.type, p.value])) as Record<string, string>;
};

/** "2026-11-12T09:00" typed in a given timezone to a UTC ISO string. */
export function zonedToUtc(local: string, tz: string): string {
  const [d, t] = local.split("T");
  const [y, m, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, da, h, mi);
  const p = parts(guess, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(guess - (asUtc - guess)).toISOString();
}

/** UTC ISO string to "YYYY-MM-DDTHH:mm" in a given timezone, for datetime-local inputs. */
export function utcToZoned(iso: string, tz: string): string {
  const p = parts(new Date(iso).getTime(), tz);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
