export const API = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";
export const WS_URL = API.replace(/^http/, "ws");

const KEY = "interpay_token";
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

type Opts = { method?: string; body?: unknown; form?: FormData; headers?: Record<string, string>; auth?: boolean };

export async function api<T = any>(path: string, o: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { ...(o.headers ?? {}) };
  const token = getToken();
  if (token && o.auth !== false) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (o.form) body = o.form;
  else if (o.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(o.body);
  }
  const res = await fetch(API + path, { method: o.method ?? (body ? "POST" : "GET"), headers, body });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = Array.isArray(j.detail) ? j.detail.map((d: any) => d.msg).join(", ") : j.detail ?? msg;
    } catch {}
    throw new Error(msg);
  }
  const type = res.headers.get("content-type") ?? "";
  return (type.includes("json") ? res.json() : res.text()) as Promise<T>;
}

export const wsTicket = (body: object = {}, auth = true) => api<{ ticket: string }>("/api/ws/ticket", { body, auth }).then((r) => r.ticket);
