// pages/ContactPage.jsx — Phase 22 §22d/e/g + §22l. Self-serve first: a status line, search + quick links and
// the user's open tickets precede the contact routes. Routes are rows in one group; the phone panel nests inside
// the urgent route (with a live open/closed pill). The points-booking boundary sits in the footer. Reading
// ?booking= : Duffel → form; otherwise → BookingBoundary.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getBookings, createTicket, getStatus, getHelpTopPicks, getOpenTickets, searchHelp, apiErrorMessage } from "../utils/api";
import { useAppStore } from "../store/appStore";
import BookingBoundary from "../components/support/BookingBoundary";
import SupportAssistant from "../components/support/SupportAssistant";
import Icon from "../components/support/icons";

const SUPPORT_PHONE = "+44 20 3966 1066"; // placeholder — real number is a pre-go-live task
const HOURS = { open: 6, close: 23 }; // staffed 06:00–23:00 GMT
const isOpenNow = () => { const h = new Date().getHours(); return h >= HOURS.open && h < HOURS.close; };

function RouteRow({ icon, urgent, title, desc, sla, channel, active, onClick, children }) {
  return (
    <div className={`border-b border-[#f0ebe3] last:border-0 ${active && urgent ? "bg-[#FDF6F2]" : ""}`}>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] ${urgent ? "bg-[#FBE3DA] text-[#B5603F]" : "bg-[#F0ECE5] text-[#6B635B]"}`}><Icon name={icon} size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-bold tracking-[-0.2px] text-ink">{title}</span>
          <span className="block text-[12.5px] text-[#8A8078]">{desc}</span>
        </span>
        <span className="flex-shrink-0 text-right">
          <span className="block text-[11.5px] font-semibold text-[#6B635B]">{sla}</span>
          <span className="block text-[11px] text-[#B8AFA3]">{channel}</span>
        </span>
        <Icon name="chevronDown" size={16} className={`flex-shrink-0 text-[#C4BCB2] transition-transform ${active ? "rotate-180" : ""}`} />
      </button>
      {active && children}
    </div>
  );
}

export default function ContactPage() {
  const [params] = useSearchParams();
  const user = useAppStore((s) => s.user);
  const [route, setRoute] = useState(params.get("urgency") || (params.get("booking") ? "booking_issue" : null));
  const [status, setStatus] = useState(null);
  const [picks, setPicks] = useState([]);
  const [openTickets, setOpenTickets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingId, setBookingId] = useState(params.get("booking") || "");
  const [form, setForm] = useState({ email: user?.email || "", name: user?.name || "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setResults([]);
    const t = setTimeout(() => searchHelp(q).then(setResults).catch(() => setResults([])), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    getStatus().then(setStatus).catch(() => {});
    getHelpTopPicks().then(setPicks).catch(() => {});
    // Called regardless of the signed-in flag — they 401 (→ empty) when logged out in prod, and surface the
    // caller's tickets/bookings in dev. This is what someone who already contacted us needs to see.
    getOpenTickets().then(setOpenTickets).catch(() => setOpenTickets([]));
    getBookings().then(setBookings).catch(() => setBookings([]));
  }, [user]);

  const selectedBooking = useMemo(() => bookings.find((b) => b.id === bookingId) || null, [bookings, bookingId]);
  const isThirdParty = selectedBooking && selectedBooking.confirmationMethod && selectedBooking.confirmationMethod !== "duffel";

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await createTicket({ email: form.email || undefined, name: form.name || undefined, urgency: route || "general", category: "booking-and-payment", subject: form.subject || "Support request", message: form.message, bookingId: bookingId || undefined });
      setSubmitted(res);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef7f1] text-[#1E7E40]"><Icon name="check" size={24} sw={2.4} /></span>
        <h1 className="mt-4 font-display text-[26px] font-bold text-ink">We&rsquo;ve got your request</h1>
        <p className="mt-2 text-[14px] text-ink-soft">Your reference is <b className="tabular-nums">{submitted.reference}</b>. We&rsquo;ve emailed you a confirmation.</p>
        <Link to={`/help/ticket/${submitted.reference}`} className="mt-5 inline-block rounded-lg bg-[#141210] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#332B25]">View your request</Link>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-[#e3ded6] bg-white px-3 py-2.5 text-[14px] text-ink focus:border-bonza focus:outline-none";
  const open = isOpenNow();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/help" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink"><Icon name="chevronRight" size={14} className="rotate-180" /> Help</Link>
      <h1 className="mt-4 font-display text-[28px] font-bold text-ink">How can we help?</h1>
      <p className="mt-1 text-[14px] text-[#7A7269]">Most questions are answered below. If not, we&rsquo;ll get you to a person.</p>

      {/* Status line */}
      {status && (
        <Link to="/status" className="mt-5 flex items-center justify-between gap-2 rounded-xl border border-[#EAE4DB] bg-white px-4 py-2.5">
          <span className="flex items-center gap-2 text-[13px] text-ink">
            <span className="h-2 w-2 rounded-full" style={{ background: status.incident ? "#da7756" : "#1E7E40" }} />
            {status.incident ? "Some Bonza services are affected" : "All Bonza services are running normally"}
          </span>
          <span className="text-[12px] font-semibold text-[#B5603F]">Status →</span>
        </Link>
      )}

      {/* Search (covers everything — the pills are just the five most common) */}
      <div className="relative mt-4 max-w-[480px]">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"><Icon name="search" size={17} /></span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help" className="w-full rounded-xl border border-[#e3ded6] bg-white py-2.5 pl-11 pr-4 text-[14.5px] text-ink focus:border-bonza focus:outline-none" />
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#e0d9cf] bg-white shadow-[0_16px_38px_rgba(40,30,20,0.16)]">
            {results.map((r) => (
              <li key={r.slug}><Link to={`/help/${r.category}/${r.slug}`} className="block px-4 py-2.5 hover:bg-cream"><p className="text-[14px] font-semibold text-ink">{r.title}</p><p className="text-[12.5px] text-ink-muted">{r.summary}</p></Link></li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick links */}
      {picks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {picks.map((p) => (
            <Link key={p.slug} to={`/help/${p.topic}/${p.slug}`} className="rounded-full border border-[#e3ded6] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:border-bonza hover:text-bonza">{p.title}</Link>
          ))}
        </div>
      )}

      {/* Open tickets */}
      {openTickets.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">Your open tickets</p>
          <div className="overflow-hidden rounded-2xl border border-[#EAE4DB] bg-white">
            {openTickets.map((t) => (
              <Link key={t.reference} to={`/help/ticket/${t.reference}`} className="flex items-center justify-between gap-3 border-b border-[#f0ebe3] px-5 py-3 last:border-0 hover:bg-cream">
                <span className="min-w-0"><span className="block truncate text-[14px] font-semibold text-ink">{t.subject}</span><span className="block text-[12px] text-ink-muted tabular-nums">{t.reference} · {new Date(t.createdAt).toLocaleDateString("en-GB")}</span></span>
                <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.status === "awaiting_user" ? "bg-[#FDF0E8] text-[#B5603F]" : "bg-[#E4F0E7] text-[#1B5E3A]"}`}>{t.status === "awaiting_user" ? "Awaiting you" : "We're on it"}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Routes */}
      <p className="mb-2 mt-7 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">Still need a person?</p>
      <div className="overflow-hidden rounded-2xl border border-[#EAE4DB] bg-white">
        <RouteRow icon="alert" urgent title="I'm travelling in the next 48 hours" desc="Flight, hotel or car issue right now" sla="Under 10 min" channel="Phone" active={route === "travelling_now"} onClick={() => setRoute(route === "travelling_now" ? null : "travelling_now")}>
          <div className="border-t border-[#F6E2D7] bg-[#FDF6F2] px-5 py-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#B5603F]">Call us now</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.6px] text-ink tabular-nums"><Icon name="phone" size={20} className="text-[#B5603F]" /> {SUPPORT_PHONE}</a>
              <button type="button" className="rounded-[9px] bg-[#141210] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#332B25]">Start live chat</button>
            </div>
            <p className="mt-2 flex items-center gap-2 text-[12.5px] text-[#8A6A5A]">
              Lines staffed 06:00–23:00 GMT
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${open ? "bg-[#E4F0E7] text-[#1B5E3A]" : "bg-[#F1ECE4] text-[#8A8078]"}`}><span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-[#1B5E3A]" : "bg-[#B8AFA3]"}`} />{open ? "Open now" : "Closed — opens 06:00"}</span>
            </p>
          </div>
        </RouteRow>

        <RouteRow icon="credit-card" title="I have a problem with a booking" desc="Not travelling yet — we'll attach it" sla="Within 24 hours" channel="Email" active={route === "booking_issue"} onClick={() => setRoute(route === "booking_issue" ? null : "booking_issue")}>
          <div className="border-t border-[#f0ebe3] px-5 py-4 space-y-3">
            {bookings.length > 0 && (
              <select value={bookingId} onChange={(e) => setBookingId(e.target.value)} className={inputCls}>
                <option value="">Not about a specific booking</option>
                {bookings.map((b) => <option key={b.id} value={b.id}>{b.description || `${b.leg} · ${b.supplier}`}</option>)}
              </select>
            )}
            {isThirdParty ? (
              <BookingBoundary booking={selectedBooking} onAskBonza={() => setRoute("general")} />
            ) : (
              <form onSubmit={submit} className="space-y-3">
                {!user && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
                    <input placeholder="Name (optional)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
                  </div>
                )}
                <input required placeholder="Subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className={inputCls} />
                <textarea required rows={4} placeholder="What's going on?" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className={inputCls} />
                {error && <p className="text-[13px] text-red-500">{error}</p>}
                <button type="submit" disabled={sending} className="rounded-lg bg-[#141210] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#332B25] disabled:opacity-50">{sending ? "Sending…" : "Send request"}</button>
              </form>
            )}
          </div>
        </RouteRow>

        <RouteRow icon="help-circle" title="Something else" desc="Points, Pro, Credits or account" sla="Ask Bonza" channel="Email if needed" active={route === "general"} onClick={() => setRoute(route === "general" ? null : "general")}>
          <div className="border-t border-[#f0ebe3] px-5 py-4"><SupportAssistant /></div>
        </RouteRow>
      </div>

      {/* Boundary note in the footer */}
      <p className="mt-6 text-[13px] leading-relaxed text-ink-soft">
        Booked with points on an airline or hotel site? That booking belongs to them and we can&rsquo;t change it — but we can explain your options.{" "}
        <Link to="/help/booking-and-payment/booking-with-points-what-to-expect" className="font-semibold text-bonza hover:text-bonza-dark">How points bookings work</Link> · <Link to="/help/complaints" className="font-semibold text-bonza hover:text-bonza-dark">Complaints</Link>
      </p>
    </div>
  );
}
