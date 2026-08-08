// pages/BookingsHistory.jsx — past bookings list.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBookings, apiErrorMessage } from "../utils/api";
import { formatGbp, shortDate } from "../utils/format";

export default function BookingsHistory() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getBookings()
      .then(setBookings)
      .catch((err) => {
        setError(apiErrorMessage(err));
        setBookings([]);
      });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 font-jakarta text-ink">
      <h1 className="font-display text-[28px] font-semibold tracking-[-0.01em]">Your bookings</h1>
      <p className="mt-1 text-[13px] text-ink-soft">Every trip you've booked or confirmed through Bonza.</p>

      {error && <p className="mt-4 text-[13px] text-bonza-dark">{error}</p>}

      {bookings === null ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[rgba(40,30,20,0.08)] bg-white p-8 text-center">
          <p className="text-[14px] font-semibold text-ink">No bookings yet</p>
          <p className="mt-1 text-[13px] text-ink-soft">When you book a trip it'll show up here.</p>
          <Link to="/dashboard" className="mt-4 inline-block rounded-full bg-bonza px-5 py-2 text-[13px] font-semibold text-white hover:bg-bonza-dark">
            Plan a trip
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {bookings.map((b) => (
            <li key={b.id} className="flex items-center gap-4 rounded-2xl border border-[rgba(40,30,20,0.06)] bg-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream text-bonza">
                <LegIcon leg={b.leg} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">
                  {b.description || `${b.leg} booking`}
                </p>
                <p className="text-[12px] text-ink-muted tabular-nums">
                  {b.supplier}
                  {b.confirmedAt ? ` · ${shortDate(b.confirmedAt)}` : ""}
                  {b.status && b.status !== "confirmed" ? ` · ${b.status}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className="text-[14px] font-bold text-ink">
                  {b.bookingType === "cash"
                    ? formatGbp(b.cashValueGbp || 0)
                    : `${Number(b.pointsUsed || 0).toLocaleString("en-GB")} pts`}
                </p>
                {b.creditsAwarded > 0 && (
                  <p className="text-[11px] font-semibold text-bonza">+{formatGbp(b.creditsAwarded)} credits</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LegIcon({ leg }) {
  const paths = {
    flight: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 4.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
    hotel: <><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /></>,
    car: <><path d="M5 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /><path d="M5 17H3v-6l2-5h9l4 5h3a2 2 0 0 1 2 2v4h-2M7 17h8" /></>,
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[leg] || paths.flight}
    </svg>
  );
}
