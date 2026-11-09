import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EventCard, formatDateTime, naira } from "@shared";
import { api } from "../api";
import { usePageMeta } from "../meta";
import { Badge, MODE_LABEL } from "../ui";

export default function Home() {
  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [error, setError] = useState("");
  usePageMeta({
    title: "Event tickets with protected payments",
    description: "Buy event tickets with payments held until the event happens, and refunds when the organiser allows cancellation.",
    path: "/",
    jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: "InterPay", url: location.origin },
  });
  useEffect(() => { api<EventCard[]>("/api/events", { auth: false }).then(setEvents).catch((e) => setError(e.message)); }, []);

  return (
    <main>
      <section className="hero">
        <h1>Buy event tickets. Your money is held until the event happens.</h1>
        <p>
          InterPay collects ticket payments through the Interswitch Payment Gateway and releases the money to the organiser only after the
          event takes place. If the organiser allows cancellation, you can cancel up to 12 hours before the start and get a refund.
        </p>
        <div className="actions">
          <a className="btn" href="#events">Browse events</a>
          <Link className="btn ghost" to="/login">Create an event</Link>
        </div>
      </section>
      <section aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <ol className="steps">
          <li><h3>Register</h3>Pick your tickets and tell us whether you will attend in person or online.</li>
          <li><h3>Pay securely</h3>Pay on the Interswitch checkout. A confirmation email with your tickets arrives straight away.</li>
          <li><h3>Attend or cancel</h3>Scan your QR code at the door or join online. Cancel before the cutoff if the organiser allows it.</li>
        </ol>
      </section>
      <section id="events" className="section" aria-labelledby="up">
        <h2 id="up">Upcoming events</h2>
        {error && <p role="alert" className="muted">Could not load events: {error}</p>}
        {events && events.length === 0 && <p className="muted">No events are listed yet. Organisers can create and publish one in a few minutes.</p>}
        <div className="grid">
          {events?.map((e) => (
            <article className="card" key={e.id}>
              {e.image ? <img className="pic" src={e.image} alt={`Flyer for ${e.title}`} /> : <div className="pic" aria-hidden="true">{e.category}</div>}
              <div className="body">
                <Link className="title" to={e.canonical_path}>{e.title}</Link>
                <span className="muted small">{formatDateTime(e.start_at, e.timezone)}</span>
                <span className="muted small">{e.venue_name ?? "Online"}</span>
                <div><Badge>{MODE_LABEL[e.attendance_mode]}</Badge></div>
                {e.from_price_kobo !== null && <strong>{e.from_price_kobo === 0 ? "Free" : `From ${naira(e.from_price_kobo)}`}</strong>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
