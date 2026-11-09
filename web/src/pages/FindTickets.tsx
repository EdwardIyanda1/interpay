import { useState } from "react";
import { api } from "../api";
import { usePageMeta } from "../meta";
import { Field, Notice } from "../ui";

export default function FindTickets() {
  usePageMeta({ title: "Find my tickets", description: "Get a link to your InterPay tickets by email." });
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api("/api/tickets/lookup", { body: { email }, auth: false }); setState("sent"); }
    catch (err: any) { setState("error"); setMsg(err.message); }
  };
  return (
    <main style={{ maxWidth: 520 }}>
      <h1>Find my tickets</h1>
      <p className="muted">Enter the email you used at checkout. If we find paid orders, we email you a link to each ticket page.</p>
      <form onSubmit={submit}>
        <Field label="Email address"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        <button className="btn" type="submit">Email me my tickets</button>
      </form>
      {state === "sent" && <Notice kind="ok">If there are tickets for this address, an email is on its way.</Notice>}
      {state === "error" && <Notice kind="error">{msg}</Notice>}
    </main>
  );
}
