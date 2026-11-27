// components/explore/ExplorePanel.jsx — Phase 18/19. The country list beside the map. Rows and map pins are
// linked two-way on hover; clicking a country (row or pin) opens that country's /explore/:code page.
import { useEffect } from "react";

function Flag({ code, className }) {
  return (
    <span className={`overflow-hidden rounded-full bg-[#e6e6e6] ${className}`}>
      <img
        src={`https://flagcdn.com/w40/${code}.png`}
        alt=""
        onError={(e) => (e.currentTarget.style.visibility = "hidden")}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

function Thumb({ imageUrl, gradient, className }) {
  return (
    <span className={`relative flex-shrink-0 overflow-hidden rounded-[9px] ${className}`}>
      <span className="absolute inset-0" style={{ background: gradient }} />
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          onError={(e) => (e.currentTarget.style.display = "none")}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}

function CountryList({ countries, hovered, onSelect, onHover }) {
  // When the hover came from the map, scroll the row into view (nearest — never jump the whole list).
  useEffect(() => {
    if (!hovered) return;
    document.getElementById(`explore-row-${hovered}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [hovered]);

  return (
    <div className="flex-1 overflow-y-auto">
      {countries.map((c) => (
        <div
          key={c.code}
          id={`explore-row-${c.code}`}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(c.code)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(c.code))}
          onMouseEnter={() => onHover(c.code)}
          onMouseLeave={() => onHover(null)}
          className={`flex cursor-pointer items-center gap-3 border-b border-[#F2EFEA] px-4 py-2.5 transition-colors ${
            hovered === c.code ? "bg-[#FAF8F5]" : "hover:bg-[#FAF8F5]"
          }`}
        >
          <Thumb imageUrl={c.imageUrl} gradient={c.gradient} className="h-[42px] w-[56px]" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[14px] font-bold text-[#141210]">
              <Flag code={c.code} className="h-[15px] w-[15px] flex-shrink-0" />
              <span className="truncate">{c.name}</span>
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#8A8078]">
              {c.cityCount} {c.cityCount === 1 ? "city" : "cities"}
              {c.awardSeatsOpen && <span className="ml-1.5 font-semibold text-[#1B7040]">· Seats open</span>}
            </p>
          </div>
          <div className="flex-shrink-0 text-right tabular-nums">
            <p className="text-[13.5px] font-bold text-[#141210]">from £{c.cashFrom.toLocaleString()}</p>
            {c.pointsLabel && <p className="text-[11px] font-semibold text-[#B5603F]">{c.pointsLabel}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExplorePanel({ countries, hovered, loading, onSelect, onHover }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[18px] border border-[#EFEBE4] bg-white">
      {loading ? (
        <div className="flex-1 space-y-px overflow-hidden p-2" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[62px] rounded-lg bg-[#F4F2ED]" />
          ))}
        </div>
      ) : (
        <CountryList countries={countries} hovered={hovered} onSelect={onSelect} onHover={onHover} />
      )}
    </div>
  );
}
