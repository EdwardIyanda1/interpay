import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth, User } from "../App";
import { usePageMeta } from "../meta";
import { Field, Notice } from "../ui";

export default function Login() {
  usePageMeta({ title: "Organiser sign in", description: "Sign in or create an organiser account to publish events on InterPay." });
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ email: "", password: "", name: "" });
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const r = await api<{ token: string; user: User }>(`/api/auth/${mode}`, { body: f, auth: false });
      signIn(r.token, r.user);
      nav(r.user.role === "admin" ? "/admin" : "/organiser");
    } catch (x: any) { setErr(x.message); }
  };
  return (
    <main style={{ maxWidth: 440 }}>
      <h1>{mode === "login" ? "Organiser sign in" : "Create an organiser account"}</h1>
      <form onSubmit={submit}>
        {mode === "register" && <Field label="Your name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>}
        <Field label="Email address"><input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
        <Field label="Password" hint={mode === "register" ? "At least 8 characters" : undefined}>
          <input type="password" required minLength={mode === "register" ? 8 : 1} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </Field>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="actions">
          <button className="btn" type="submit">{mode === "login" ? "Sign in" : "Create account"}</button>
          <button className="btn ghost" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create an account" : "I already have an account"}
          </button>
        </div>
      </form>
    </main>
  );
}
