// components/FlightGrid.jsx — Left-side grid of flights for Step 2.
// Debounced-fetches against the flight filters + trip route, and renders
// clickable cards. Cards that can't fit the remaining budget (even at max
// affordable points) are greyed out and labelled "Exceeds budget".
import { useEffect, useState } from "react";
import { useAppStore, comboFitsBudget, tripNights } from "../store/appStore";
import { getFlights } from "../utils/api";
import { formatMoney, formatPoints } from "../utils/format";
import CardPhoto from "./CardPhoto";
import {
  ProgramPills,
  PointsValueBadge,
  BudgetBadge,
  SelectedBadge,
  SkeletonGrid,
  Tag,
  seedFromId,
  gridColsClass,
  cardClass,
  cardButtonProps,
  cardRevealProps,
} from "./cardBits";

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

export default function FlightGrid({ columns = 2 }) {
  const filters = useAppStore((s) => s.filters.flights);
  const trip = useAppStore((s) => s.trip);
  const flights = useAppStore((s) => s.flights);
  const setFlights = useAppStore((s) => s.setFlights);
  const selectedFlight = useAppStore((s) => s.selectedFlight);
  const selectedHotel = useAppStore((s) => s.selectedHotel);
  const selectedCar = useAppStore((s) => s.selectedCar);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const selectFlight = useAppStore((s) => s.selectFlight);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      getFlights({ ...filters, from: trip?.origin, to: trip?.destination, checkIn: trip?.checkIn })
        .then(setFlights)
        .catch(() => setFlights([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [filters, trip, setFlights]);

  if (loading && !flights.length) return <SkeletonGrid columns={columns} />;
  if (!flights.length) {
    return <p className="py-8 text-center text-sm text-ink-muted">No flights match your filters.</p>;
  }

  const nights = tripNights(trip);
  const budget = trip?.budget;

  return (
    <div
      className={`grid max-h-[760px] grid-cols-1 gap-4 overflow-y-auto pr-1 transition-opacity ${
        loading ? "opacity-60" : "opacity-100"
      } ${gridColsClass(columns)}`}
    >
      {flights.map((flight, i) => {
        const selected = selectedFlight?.id === flight.id;
        const fits = selected || comboFitsBudget(flight, selectedHotel, selectedCar, loyaltyPoints, nights, budget);
        return (
          <FlightCard
            key={flight.id}
            index={i}
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

function FlightCard({ flight, selected, disabled, onClick, index = 0 }) {
  const cheapestMiles = Math.min(...Object.values(flight.milesRequired));
  const centsPerPoint = cheapestMiles > 0 ? (flight.basePrice / cheapestMiles) * 100 : 0;
  const stopsLabel =
    flight.stops === 0 ? "Non-stop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`;
  const reveal = cardRevealProps(index);
  return (
    <div
      {...cardButtonProps(disabled, onClick, selected)}
      className={`${cardClass(selected, disabled)} ${reveal.className}`}
      style={reveal.style}
    >
      <CardPhoto
        query={`${flight.airline} aircraft`}
        seed={seedFromId(flight.id)}
        alt={flight.airline}
        badge={
          <>
            {disabled && <BudgetBadge />}
            {selected && <SelectedBadge />}
          </>
        }
      />
      <div className="flex flex-1 flex-col p-3.5">
        <ProgramPills programs={[flight.airline, "Amex"]} />
        <div className="mt-2 flex items-start justify-between gap-2">
          <p className="text-[14px] font-extrabold leading-tight text-ink">
            {flight.airline} · {flight.cabin}
          </p>
          <span className="shrink-0 rounded-full bg-cream px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
            {stopsLabel}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] tabular-nums text-ink-soft">
          {flight.from} {fmtTime(flight.departureTime)} → {flight.to} {fmtTime(flight.arrivalTime)} · {durationLabel(flight)}
        </p>
        {(flight.refundable || flight.baggageIncluded) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {flight.refundable && <Tag>Refundable</Tag>}
            {flight.baggageIncluded && <Tag>Bags included</Tag>}
          </div>
        )}

        {/* Price + points */}
        <div className="mt-3 flex items-end justify-between gap-2 tabular-nums">
          <div>
            <p className="text-[15px] font-extrabold leading-none text-ink">
              {formatMoney(flight.basePrice)}
              <span className="text-[11px] font-medium text-ink-muted"> /person</span>
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">round trip, taxes incl.</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-bold leading-none text-ink">{formatPoints(cheapestMiles)} pts</p>
            <div className="mt-1 flex items-center justify-end">
              <PointsValueBadge cents={centsPerPoint} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
