// pages/FlexibleDates.jsx — Flexible-dates month chooser.
// When the traveler's dates are flexible, Bonza shops across the next 12 months
// and shows one optimized flight + hotel + car combo per month (best points/cash
// mix for an optimized 7-night window). Clicking a month loads that combo + dates
// into the store and opens Step 2.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StepIndicator from "./StepIndicator";
import {
  useAppStore,
  computeCombination,
  maxComboRatio,
  comboFitsBudget,
} from "../store/appStore";
import { getFlights, getHotels, getCars, createTrip } from "../utils/api";
import { formatMoney, formatPoints, shortDate } from "../utils/format";

const MONTHS = 12;
const NIGHTS = 7;

// YYYY-MM-DD for the given UTC calendar date.
const isoDate = (y, m, day) => new Date(Date.UTC(y, m, day)).toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const monthLabel = (y, m) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default function FlexibleDates() {
  const navigate = useNavigate();

  const trip = useAppStore((s) => s.trip);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const setTrip = useAppStore((s) => s.setTrip);
  const setTripId = useAppStore((s) => s.setTripId);
  const setSelections = useAppStore((s) => s.setSelections);

  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // No trip context (e.g. refresh) -> restart at Step 1.
  useEffect(() => {
    if (!trip?.origin) navigate("/", { replace: true });
  }, [trip, navigate]);

  // For each upcoming month, fetch inventory priced for that month's window
  // (cash moves with the season) and assemble one optimized combo per month.
  useEffect(() => {
    if (!trip?.origin) return undefined;
    let alive = true;
    setLoading(true);
    const now = new Date();
    const budget = trip?.budget;
    const destination = trip.destinationLabel || trip.destination;

    const specs = [];
    for (let i = 0; i < MONTHS; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const checkIn = isoDate(y, m, 6 + ((i * 3) % 14));
      specs.push({ i, y, m, checkIn, checkOut: addDays(checkIn, NIGHTS), label: monthLabel(y, m) });
    }

    Promise.all(
      specs.map(async (s) => {
        const [flights, hotels, cars] = await Promise.all([
          getFlights({ from: trip.origin, to: trip.destination, checkIn: s.checkIn }),
          getHotels({ destination, checkIn: s.checkIn }),
          getCars({ location: destination, checkIn: s.checkIn }),
        ]);
        if (!flights.length || !hotels.length || !cars.length) return null;
        const flight = flights[(s.i * 7) % flights.length];
        const hotel = hotels[(s.i * 11) % hotels.length];
        const car = cars[(s.i * 5) % cars.length];
        const ratio = maxComboRatio(flight, hotel, car, loyaltyPoints, NIGHTS);
        const totals = computeCombination(flight, hotel, car, loyaltyPoints, NIGHTS, ratio);
        const fits = comboFitsBudget(flight, hotel, car, loyaltyPoints, NIGHTS, budget);
        return { key: `${s.y}-${s.m}`, label: s.label, checkIn: s.checkIn, checkOut: s.checkOut, flight, hotel, car, totals, fits };
      })
    )
      .then((rows) => alive && setMonths(rows.filter(Boolean)))
      .catch(() => alive && setMonths([]))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [trip?.origin, trip?.destination, trip?.destinationLabel, trip?.budget, loyaltyPoints]);

  const choose = async (mo) => {
    if (busy) return;
    setBusy(true);
    setTrip({ ...trip, checkIn: mo.checkIn, checkOut: mo.checkOut });
    try {
      const { id } = await createTrip({
        origin: trip.origin,
        originLabel: trip.originLabel,
        destination: trip.destination,
        destinationLabel: trip.destinationLabel,
        checkIn: mo.checkIn,
        checkOut: mo.checkOut,
        budget: Number(trip.budget) || 0,
        numberOfTravelers: trip.numberOfTravelers || 1,
        flexibility: true,
      });
      setTripId(id);
    } catch {
      /* offline / API hiccup — still load the selection so the user can browse */
    }
    setSelections({ flight: mo.flight, hotel: mo.hotel, car: mo.car });
    navigate("/optimize");
  };

  if (!trip?.origin) return null;

  return (
    <div className="min-h-screen bg-cream font-jakarta text-ink">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <StepIndicator currentStep={1} />

        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-extrabold tracking-[-0.01em] text-ink">Pick your best month</h2>
            <p className="text-[13px] text-ink-soft">
              {trip.originLabel || trip.origin} → {trip.destinationLabel || trip.destination} · flexible
              dates · {NIGHTS} nights
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-bonza hover:text-bonza-dark"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-ink-muted">Shopping every month for the best deal…</p>
        ) : !months.length ? (
          <p className="py-12 text-center text-sm text-ink-muted">
            Couldn't load inventory. Go back and try again.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {months.map((mo) => (
              <MonthCard key={mo.key} month={mo} budget={trip.budget} onClick={() => choose(mo)} disabled={busy} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline SVG icons for the per-segment summary (no emoji, per the theme convention).
const SEG_ICON = {
  flight: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 4.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
  hotel: <><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" /></>,
  car: <><path d="M5 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /><path d="M5 17h-2v-6l2-5h9l4 5h3a2 2 0 0 1 2 2v4h-2M7 17h8" /></>,
};

function SegIcon({ type }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0 text-ink-muted" aria-hidden="true">
      {SEG_ICON[type]}
    </svg>
  );
}

function MonthCard({ month, budget, onClick, disabled }) {
  const { label, checkIn, checkOut, flight, hotel, car, totals, fits } = month;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-2xl bg-white p-4 text-left font-jakarta shadow-[0_1px_2px_rgba(40,30,20,0.04),0_10px_30px_rgba(120,80,50,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(120,80,50,0.16)] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-bonza focus-visible:ring-offset-2",
        fits ? "ring-1 ring-black/5" : "ring-1 ring-[#f0c9bb]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] font-extrabold text-ink">{label}</p>
        {budget > 0 && (
          <span
            className={[
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold",
              fits ? "bg-[#EAF6EE] text-[#1E7E40]" : "bg-[#FBE8E0] text-[#c0603c]",
            ].join(" ")}
          >
            {fits ? "Within budget" : "Over budget"}
          </span>
        )}
      </div>
      <p className="mt-1 text-[12px] tabular-nums text-ink-muted">
        {shortDate(checkIn)} – {shortDate(checkOut)}
      </p>

      <ul className="mt-3 space-y-1.5 text-[12px] text-ink-soft">
        <li className="flex items-center gap-2"><SegIcon type="flight" /> {flight.airline} · {flight.cabin}</li>
        <li className="flex items-center gap-2"><SegIcon type="hotel" /> {hotel.name} · {hotel.stars}-star</li>
        <li className="flex items-center gap-2"><SegIcon type="car" /> {car.vendor} · {car.carClass}</li>
      </ul>

      <div className="mt-3 border-t border-[#f0ece5] pt-2 tabular-nums">
        <p className="text-[14px] font-extrabold text-ink">
          from {formatMoney(totals.totalCash)}
          {totals.pointsUsed > 0 && (
            <span className="font-medium text-ink-muted"> + {formatPoints(totals.pointsUsed)} pts</span>
          )}
        </p>
        {totals.savingsAmount > 0 && (
          <p className="text-[12px] font-semibold text-[#1E7E40]">save {formatMoney(totals.savingsAmount)}</p>
        )}
      </div>
    </button>
  );
}
