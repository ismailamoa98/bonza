// components/CarGrid.jsx — Left-side grid of rental cars for Step 2.
// Debounced-fetches against the car filters + trip location, and renders
// clickable cards. Cars are cash-only, so a card is greyed when its cash (over
// the rental days) would push the combo over the remaining budget.
import { useEffect } from "react";
import { useAppStore, comboFitsBudget, tripNights } from "../store/appStore";
import { getCars } from "../utils/api";
import { formatMoney } from "../utils/format";

export default function CarGrid() {
  const filters = useAppStore((s) => s.filters.cars);
  const trip = useAppStore((s) => s.trip);
  const cars = useAppStore((s) => s.cars);
  const setCars = useAppStore((s) => s.setCars);
  const selectedCar = useAppStore((s) => s.selectedCar);
  const selectedFlight = useAppStore((s) => s.selectedFlight);
  const selectedHotel = useAppStore((s) => s.selectedHotel);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const selectCar = useAppStore((s) => s.selectCar);

  useEffect(() => {
    const handle = setTimeout(() => {
      getCars({ ...filters, location: trip?.destinationLabel || trip?.destination, checkIn: trip?.checkIn })
        .then(setCars)
        .catch(() => setCars([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [filters, trip, setCars]);

  if (!cars.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No cars match your filters.</p>;
  }

  const nights = tripNights(trip);
  const budget = trip?.budget;

  return (
    <div className="grid max-h-[640px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
      {cars.map((car) => {
        const selected = selectedCar?.id === car.id;
        const fits = selected || comboFitsBudget(selectedFlight, selectedHotel, car, loyaltyPoints, nights, budget);
        return (
          <CarCard
            key={car.id}
            car={car}
            nights={nights}
            selected={selected}
            disabled={!fits}
            onClick={() => fits && selectCar(car)}
          />
        );
      })}
    </div>
  );
}

function CarCard({ car, nights, selected, disabled, onClick }) {
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
          <p className="text-sm font-semibold text-slate-800">{car.vendor}</p>
          <p className="text-[11px] text-slate-500">
            {car.carClass} · {car.seats} seats · {car.transmission}
          </p>
        </div>
        <span className="text-3xl">🚗</span>
      </div>
      <p className="mt-2 text-xs font-medium text-slate-700">
        {formatMoney(car.pricePerDay)}/day · {formatMoney(car.pricePerDay * nights)} total
      </p>
      {car.benefits.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {car.benefits.map((b) => (
            <span key={b} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              {b}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
