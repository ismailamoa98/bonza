// components/HotelGrid.jsx — Left-side grid of hotels for Step 2.
// Debounced-fetches against the hotel filters + trip destination, and renders
// clickable cards. Cards that can't fit the remaining budget (even at max
// affordable points) are greyed out and labelled "Exceeds budget".
import { useEffect, useState } from "react";
import { useAppStore, comboFitsBudget, tripNights } from "../store/appStore";
import { getHotels } from "../utils/api";
import { formatMoney, formatPoints } from "../utils/format";
import CardPhoto from "./CardPhoto";
import {
  ProgramPills,
  PointsValueBadge,
  RatingChip,
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

export default function HotelGrid({ columns = 2 }) {
  const filters = useAppStore((s) => s.filters.hotels);
  const trip = useAppStore((s) => s.trip);
  const hotels = useAppStore((s) => s.hotels);
  const setHotels = useAppStore((s) => s.setHotels);
  const selectedHotel = useAppStore((s) => s.selectedHotel);
  const selectedFlight = useAppStore((s) => s.selectedFlight);
  const selectedCar = useAppStore((s) => s.selectedCar);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const selectHotel = useAppStore((s) => s.selectHotel);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      getHotels({ ...filters, destination: trip?.destinationLabel || trip?.destination, checkIn: trip?.checkIn })
        .then(setHotels)
        .catch(() => setHotels([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [filters, trip, setHotels]);

  if (loading && !hotels.length) return <SkeletonGrid columns={columns} />;
  if (!hotels.length) {
    return <p className="py-8 text-center text-sm text-ink-muted">No hotels match your filters.</p>;
  }

  const nights = tripNights(trip);
  const budget = trip?.budget;

  return (
    <div
      className={`grid max-h-[760px] grid-cols-1 gap-4 overflow-y-auto pr-1 transition-opacity ${
        loading ? "opacity-60" : "opacity-100"
      } ${gridColsClass(columns)}`}
    >
      {hotels.map((hotel, i) => {
        const selected = selectedHotel?.id === hotel.id;
        // Can this hotel (with the current flight + car) stay within budget?
        const fits = selected || comboFitsBudget(selectedFlight, hotel, selectedCar, loyaltyPoints, nights, budget);
        return (
          <HotelCard
            key={hotel.id}
            index={i}
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

function HotelCard({ hotel, nights, selected, disabled, onClick, index = 0 }) {
  const cheapestPoints = Math.min(
    ...Object.values(hotel.loyaltyPrograms).map((p) => p.pointsPerNight)
  );
  const programs = Object.values(hotel.loyaltyPrograms).map((p) => p.program);
  const centsPerPoint = cheapestPoints > 0 ? (hotel.pricePerNight / cheapestPoints) * 100 : 0;
  const reveal = cardRevealProps(index);
  return (
    <div
      {...cardButtonProps(disabled, onClick, selected)}
      className={`${cardClass(selected, disabled)} ${reveal.className}`}
      style={reveal.style}
    >
      <CardPhoto
        query={hotel.city}
        seed={seedFromId(hotel.id)}
        alt={hotel.name}
        badge={
          <>
            {disabled && <BudgetBadge />}
            {selected && <SelectedBadge />}
          </>
        }
      />
      <div className="flex flex-1 flex-col p-3.5">
        <ProgramPills programs={programs} />
        <div className="mt-2 flex items-start justify-between gap-2">
          <p className="text-[14px] font-extrabold leading-tight text-ink">{hotel.name}</p>
          <RatingChip rating={hotel.rating} />
        </div>
        <p className="mt-0.5 text-[12px] text-ink-soft">
          {hotel.propertyType || "Hotel"} · {hotel.stars}-star · {hotel.city}
        </p>
        {hotel.freeCancellation && (
          <div className="mt-2">
            <Tag>Free cancellation</Tag>
          </div>
        )}

        {/* Price + points */}
        <div className="mt-3 flex items-end justify-between gap-2 tabular-nums">
          <div>
            <p className="text-[15px] font-extrabold leading-none text-ink">
              {formatMoney(hotel.pricePerNight)}
              <span className="text-[11px] font-medium text-ink-muted"> /night</span>
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">
              {formatMoney(hotel.pricePerNight * nights)} total w/ tax &amp; fees
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-[13px] font-bold leading-none text-ink">
              {formatPoints(cheapestPoints)}
              <span className="text-[11px] font-medium text-ink-muted">pts/night</span>
            </p>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <span className="text-[11px] text-ink-muted">{formatPoints(cheapestPoints * nights)} total</span>
              <PointsValueBadge cents={centsPerPoint} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
