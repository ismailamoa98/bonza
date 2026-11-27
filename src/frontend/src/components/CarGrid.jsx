// components/CarGrid.jsx — Left-side grid of rental cars for Step 2.
// Debounced-fetches against the car filters + trip location, and renders
// clickable cards. Cars are cash-only, so a card is greyed when its cash (over
// the rental days) would push the combo over the remaining budget.
import { useEffect, useState } from "react";
import { useAppStore, comboFitsBudget, tripNights } from "../store/appStore";
import { getCars } from "../utils/api";
import { formatMoney } from "../utils/format";
import CardPhoto from "./CardPhoto";
import {
  ProgramPills,
  BudgetBadge,
  SelectedBadge,
  SkeletonGrid,
  seedFromId,
  gridColsClass,
  cardClass,
  cardButtonProps,
  cardRevealProps,
} from "./cardBits";

export default function CarGrid({ columns = 2 }) {
  const filters = useAppStore((s) => s.filters.cars);
  const trip = useAppStore((s) => s.trip);
  const cars = useAppStore((s) => s.cars);
  const setCars = useAppStore((s) => s.setCars);
  const selectedCar = useAppStore((s) => s.selectedCar);
  const selectedFlight = useAppStore((s) => s.selectedFlight);
  const selectedHotel = useAppStore((s) => s.selectedHotel);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const selectCar = useAppStore((s) => s.selectCar);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      getCars({ ...filters, location: trip?.destinationLabel || trip?.destination, checkIn: trip?.checkIn })
        .then(setCars)
        .catch(() => setCars([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [filters, trip, setCars]);

  if (loading && !cars.length) return <SkeletonGrid columns={columns} />;
  if (!cars.length) {
    return <p className="py-8 text-center text-sm text-ink-muted">No cars match your filters.</p>;
  }

  const nights = tripNights(trip);
  const budget = trip?.budget;

  return (
    <div
      className={`grid max-h-[760px] grid-cols-1 gap-4 overflow-y-auto pr-1 transition-opacity ${
        loading ? "opacity-60" : "opacity-100"
      } ${gridColsClass(columns)}`}
    >
      {cars.map((car, i) => {
        const selected = selectedCar?.id === car.id;
        const fits = selected || comboFitsBudget(selectedFlight, selectedHotel, car, loyaltyPoints, nights, budget);
        return (
          <CarCard
            key={car.id}
            index={i}
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

function CarCard({ car, nights, selected, disabled, onClick, index = 0 }) {
  const reveal = cardRevealProps(index);
  return (
    <div
      {...cardButtonProps(disabled, onClick, selected)}
      className={`${cardClass(selected, disabled)} ${reveal.className}`}
      style={reveal.style}
    >
      <CardPhoto
        query={`${car.carClass} car`}
        seed={seedFromId(car.id)}
        alt={`${car.vendor} ${car.carClass}`}
        badge={
          <>
            {disabled && <BudgetBadge />}
            {selected && <SelectedBadge />}
          </>
        }
      />
      <div className="flex flex-1 flex-col p-3.5">
        <ProgramPills programs={[car.vendor]} />
        <p className="mt-2 text-[14px] font-extrabold leading-tight text-ink">
          {car.carClass}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-soft">
          {car.seats} seats · {car.transmission}
        </p>

        {/* Price (cash only) */}
        <div className="mt-3 tabular-nums">
          <p className="text-[15px] font-extrabold leading-none text-ink">
            {formatMoney(car.pricePerDay)}
            <span className="text-[11px] font-medium text-ink-muted"> /day</span>
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">
            {formatMoney(car.pricePerDay * nights)} total · cash only
          </p>
        </div>
      </div>
    </div>
  );
}
