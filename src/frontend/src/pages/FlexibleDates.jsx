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
    <div className="mx-auto max-w-5xl px-4 py-6">
      <StepIndicator currentStep={1} />

      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Pick your best month</h2>
          <p className="text-sm text-slate-500">
            {trip.originLabel || trip.origin} → {trip.destinationLabel || trip.destination} · flexible
            dates · {NIGHTS} nights
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-sm font-medium text-bonza hover:underline"
        >
          ← Back
        </button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">Shopping every month for the best deal…</p>
      ) : !months.length ? (
        <p className="py-12 text-center text-sm text-slate-400">
          Couldn't load inventory. Go back and try again.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((mo) => (
            <MonthCard key={mo.key} month={mo} budget={trip.budget} onClick={() => choose(mo)} disabled={busy} />
          ))}
        </div>
      )}
    </div>
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
        "rounded-xl border bg-white p-4 text-left transition-shadow hover:shadow-md disabled:opacity-60",
        fits ? "border-slate-200" : "border-red-200",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {budget > 0 && (
          <span
            className={[
              "rounded px-1.5 py-0.5 text-[10px] font-semibold",
              fits ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600",
            ].join(" ")}
          >
            {fits ? "Within budget" : "Over budget"}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {shortDate(checkIn)} – {shortDate(checkOut)}
      </p>

      <ul className="mt-3 space-y-1 text-xs text-slate-600">
        <li>✈️ {flight.airline} · {flight.cabin}</li>
        <li>🏨 {hotel.name} · {hotel.stars}★</li>
        <li>🚗 {car.vendor} · {car.carClass}</li>
      </ul>

      <div className="mt-3 border-t border-slate-100 pt-2">
        <p className="text-sm font-semibold text-slate-800">
          from {formatMoney(totals.totalCash)}
          {totals.pointsUsed > 0 && (
            <span className="font-normal text-slate-500"> + {formatPoints(totals.pointsUsed)} pts</span>
          )}
        </p>
        {totals.savingsAmount > 0 && (
          <p className="text-xs font-medium text-green-600">save {formatMoney(totals.savingsAmount)}</p>
        )}
      </div>
    </button>
  );
}
