// components/explore/country/CityCard.jsx — Phase 19. A sparse city card: 3:2 image, trip-type + seats chips,
// name + IATA, a flight row, a hotel row and an all-cash total. Nothing else — the §18i drawer carries detail.
// Clicking the card opens the drawer (it does not navigate).
import { Icon } from "./parts";

function PriceRow({ icon, label, cash, points }) {
  return (
    <div className="flex items-center gap-2 py-[0.4rem] text-[12.5px]">
      <span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-md bg-[#F4F2ED] text-[#6B4FA5]">
        <Icon name={icon} size={12} />
      </span>
      <span className="flex-1 font-semibold text-[#141210]">{label}</span>
      <span className="flex-shrink-0 text-right tabular-nums">
        <span className="font-bold text-[#141210]">{cash != null ? `£${cash.toLocaleString()}` : "—"}</span>
        {points && <span className="ml-1.5 font-semibold text-[#B5603F]">or {points}</span>}
      </span>
    </div>
  );
}

function CityCard({ city, nights, gradient, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(city.id)} className="group flex flex-col text-left">
      <div className="relative mb-[0.7rem] aspect-[3/2] overflow-hidden rounded-[15px]">
        <div className="absolute inset-0" style={{ background: gradient || "#E9E5DF" }} />
        {city.imageUrl && (
          <img src={city.imageUrl} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[550ms] group-hover:scale-[1.045]" />
        )}
        {city.tripType && (
          <span className="absolute left-[0.7rem] top-[0.7rem] rounded-md bg-white/[0.93] px-2 py-[3px] text-[10.5px] font-bold text-[#141210] backdrop-blur-[6px]">{city.tripType}</span>
        )}
        {city.awardSeatsOpen && (
          <span className="absolute right-[0.7rem] top-[0.7rem] rounded-md bg-[#9FE9BB] px-2 py-[3px] text-[10.5px] font-bold text-[#0F2E1C]">Seats open</span>
        )}
      </div>

      <p className="flex items-baseline gap-2">
        <span className="text-[17px] font-bold tracking-[-0.4px] text-[#141210]">{city.name}</span>
        <span className="text-[12px] font-semibold text-[#B8AFA3]">{city.iataCode}</span>
      </p>

      <div className="mt-1.5 border-t border-[#EAE6DF]">
        <PriceRow icon="plane" label="Flight" cash={city.flight?.cash} points={city.flight?.pointsLabel} />
        <div className="border-t border-[#EAE6DF]" />
        <PriceRow icon="bed" label="Hotel" cash={city.hotel?.cash} points={city.hotel?.pointsLabel} />
      </div>

      <div className="mt-1 flex items-center justify-between border-t-[1.5px] border-[#E5DFD6] pt-2">
        <span className="text-[12px] font-semibold text-[#8A8078]">All cash, {nights} nights</span>
        <span className="text-[15px] font-extrabold text-[#141210] tabular-nums">{city.allCash != null ? `£${city.allCash.toLocaleString()}` : "—"}</span>
      </div>
    </button>
  );
}

export default function CityGrid({ cities, nights, gradient, onOpen }) {
  return (
    <div className="grid grid-cols-1 gap-x-[1.15rem] gap-y-[1.4rem] sm:grid-cols-2 lg:grid-cols-3">
      {cities.map((c) => (
        <CityCard key={c.id} city={c} nights={nights} gradient={gradient} onOpen={onOpen} />
      ))}
    </div>
  );
}
