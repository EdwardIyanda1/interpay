import { Link } from "react-router-dom";
import { usePageMeta } from "../meta";

export default function NotFound() {
  usePageMeta({ title: "Page not found", description: "The page you are looking for does not exist." });
  return (
    <main className="max-w-xl text-center py-16">
      <span className="badge mb-3">404 Error</span>
      <h1 className="text-3xl font-bold text-ink mb-2">We could not find that page</h1>
      <p className="text-sm text-slate-500 mb-6">
        The link may be mistyped, or the event may have been renamed or unlisted.
      </p>
      <div className="flex justify-center gap-3 flex-wrap">
        <Link className="btn" to="/events">
          Browse upcoming events
        </Link>
        <Link className="btn ghost" to="/find-tickets">
          Find my tickets
        </Link>
      </div>
    </main>
  );
}