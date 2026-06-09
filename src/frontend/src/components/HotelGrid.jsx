// components/HotelGrid.jsx — Left-side grid of hotels for Step 2.
// Debounced-fetches against the hotel filters + trip destination, and renders
// clickable cards. Cards that can't fit the remaining budget (even at max
// affordable points) are greyed out and labelled "Exceeds budget".
import { useEffect } from "react";
import { useAppStore, comboFitsBudget, tripNights } from "../store/appStore";
import { getHotels } from "../utils/api";
import { formatMoney, formatPoints } from "../utils/format";

export default function HotelGrid() {
  const filters = useAppStore((s) => s.filters.hotels);
  const trip = useAppStore((s) => s.trip);
  const hotels = useAppStore((s) => s.hotels);
  const setHotels = useAppStore((s) => s.setHotels);
  const selectedHotel = useAppStore((s) => s.selectedHotel);
  const selectedFlight = useAppStore((s) => s.selectedFlight);
  const selectedCar = useAppStore((s) => s.selectedCar);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const selectHotel = useAppStore((s) => s.selectHotel);

  useEffect(() => {
    const handle = setTimeout(() => {
      getHotels({ ...filters, destination: trip?.destinationLabel || trip?.destination, checkIn: trip?.checkIn })
        .then(setHotels)
        .catch(() => setHotels([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [filters, trip, setHotels]);

  if (!hotels.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No hotels match your filters.</p>;
  }

  const nights = tripNights(trip);
  const budget = trip?.budget;

  return (
    <div className="grid max-h-[640px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
      {hotels.map((hotel) => {
        const selected = selectedHotel?.id === hotel.id;
        // Can this hotel (with the current flight + car) stay within budget?
        const fits = selected || comboFitsBudget(selectedFlight, hotel, selectedCar, loyaltyPoints, nights, budget);
        return (
          <HotelCard
            key={hotel.id}
            hotel={hotel}
            nights={nights}
            selected={selected}
            disabled={!fits}
            onClick={() => fits && selectHotel(hotel)}
          />
        );
      })}
    </div>
  );
}

function HotelCard({ hotel, nights, selected, disabled, onClick }) {
  const cheapestPoints = Math.min(
    ...Object.values(hotel.loyaltyPrograms).map((p) => p.pointsPerNight)
  );
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "relative overflow-hidden rounded-xl border bg-white text-left transition-shadow",
        disabled ? "cursor-not-allowed opacity-50" : "hover:shadow-md",
        selected ? "border-2 border-bonza" : "border-slate-200",
      ].join(" ")}
    >
      {disabled && (
        <span className="absolute right-2 top-2 z-10 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
          Exceeds budget
        </span>
      )}
      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-amber-300 to-orange-400 text-xs font-medium text-white">
        {hotel.city}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">{hotel.name}</p>
            <p className="text-[11px] text-slate-500">
              {hotel.stars}-star · {hotel.city}
            </p>
          </div>
          <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[11px] font-semibold text-slate-900">
            ★ {hotel.rating}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          {formatMoney(hotel.pricePerNight * nights)} total · or {formatPoints(cheapestPoints * nights)} pts
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {hotel.benefits.slice(0, 3).map((b) => (
            <span key={b} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              {b}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
