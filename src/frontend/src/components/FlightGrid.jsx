// components/FlightGrid.jsx — Left-side grid of flights for Step 2.
// Debounced-fetches against the flight filters + trip route, and renders
// clickable cards. Cards that can't fit the remaining budget (even at max
// affordable points) are greyed out and labelled "Exceeds budget".
import { useEffect } from "react";
import { useAppStore, comboFitsBudget, tripNights } from "../store/appStore";
import { getFlights } from "../utils/api";
import { formatMoney, formatPoints } from "../utils/format";

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });

const durationLabel = (f) => {
  const h = Math.round((new Date(f.arrivalTime) - new Date(f.departureTime)) / 3600000);
  return `${h}h`;
};

export default function FlightGrid() {
  const filters = useAppStore((s) => s.filters.flights);
  const trip = useAppStore((s) => s.trip);
  const flights = useAppStore((s) => s.flights);
  const setFlights = useAppStore((s) => s.setFlights);
  const selectedFlight = useAppStore((s) => s.selectedFlight);
  const selectedHotel = useAppStore((s) => s.selectedHotel);
  const selectedCar = useAppStore((s) => s.selectedCar);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const selectFlight = useAppStore((s) => s.selectFlight);

  useEffect(() => {
    const handle = setTimeout(() => {
      getFlights({ ...filters, from: trip?.origin, to: trip?.destination, checkIn: trip?.checkIn })
        .then(setFlights)
        .catch(() => setFlights([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [filters, trip, setFlights]);

  if (!flights.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No flights match your filters.</p>;
  }

  const nights = tripNights(trip);
  const budget = trip?.budget;

  return (
    <div className="grid max-h-[640px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
      {flights.map((flight) => {
        const selected = selectedFlight?.id === flight.id;
        const fits = selected || comboFitsBudget(flight, selectedHotel, selectedCar, loyaltyPoints, nights, budget);
        return (
          <FlightCard
            key={flight.id}
            flight={flight}
            selected={selected}
            disabled={!fits}
            onClick={() => fits && selectFlight(flight)}
          />
        );
      })}
    </div>
  );
}

function FlightCard({ flight, selected, disabled, onClick }) {
  const cheapestMiles = Math.min(...Object.values(flight.milesRequired));
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "relative rounded-xl border bg-white p-3 text-left transition-shadow",
        disabled ? "cursor-not-allowed opacity-50" : "hover:shadow-md",
        selected ? "border-2 border-bonza" : "border-slate-200",
      ].join(" ")}
    >
      {disabled && (
        <span className="absolute right-2 top-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
          Exceeds budget
        </span>
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{flight.airline}</p>
          <p className="text-[11px] text-slate-500">
            {flight.cabin} · {flight.flightNumber}
          </p>
        </div>
        <span className="text-[11px] text-slate-500">
          {flight.stops === 0 ? "Non-stop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        {flight.from} {fmtTime(flight.departureTime)} → {flight.to} {fmtTime(flight.arrivalTime)} ·{" "}
        {durationLabel(flight)}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-700">
        {formatMoney(flight.basePrice)} · or {formatPoints(cheapestMiles)} pts
      </p>
    </button>
  );
}
