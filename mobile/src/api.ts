import { API } from "./config";
import { getAuth } from "./storage";

type Opts = { method?: string; body?: unknown; headers?: Record<string, string>; auth?: boolean };

export async function api<T = any>(path: string, o: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { ...(o.headers ?? {}) };
  if (o.auth) { const t = await getAuth(); if (t) headers.Authorization = `Bearer ${t}`; }
  if (o.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(API + path, { method: o.method ?? (o.body !== undefined ? "POST" : "GET"), headers, body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = Array.isArray(j.detail) ? j.detail.map((d: any) => d.msg).join(", ") : j.detail ?? msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const wsTicket = (body: object = {}, auth = false) => api<{ ticket: string }>("/api/ws/ticket", { body, auth }).then((r) => r.ticket);
