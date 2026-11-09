import { Link } from "react-router-dom";
import { usePageMeta } from "../meta";

export default function NotFound() {
  usePageMeta({ title: "Page not found", description: "The page you are looking for does not exist." });
  return (
    <main>
      <h1>We could not find that page</h1>
      <p className="muted">The link may be mistyped, or the event may have been renamed or removed.</p>
      <div className="actions"><Link className="btn" to="/">See upcoming events</Link><Link className="btn ghost" to="/find-tickets">Find my tickets</Link></div>
    </main>
  );
}
