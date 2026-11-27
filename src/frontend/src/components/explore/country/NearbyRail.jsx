// components/explore/country/NearbyRail.jsx — Phase 19 §19f. When a country has only one or two priced cities,
// fill the space with same-continent countries (cheapest first) so the grid never looks half-empty. Reuses the
// Phase 18 country-card anatomy; each card links to that country's page.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExplore } from "../../../utils/api";

function CountryCard({ c }) {
  return (
    <Link to={`/explore/${c.code}`} className="group block">
      <div className="relative mb-2.5 aspect-[3/2] overflow-hidden rounded-[14px]">
        <div className="absolute inset-0" style={{ background: c.gradient }} />
        {c.imageUrl && (
          <img src={c.imageUrl} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        )}
      </div>
      <p className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.2px] text-[#141210]">
        <span className="h-[16px] w-[16px] flex-shrink-0 overflow-hidden rounded-full bg-[#e6e6e6]">
          <img src={`https://flagcdn.com/w40/${c.code}.png`} alt="" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className="h-full w-full object-cover" />
        </span>
        {c.name}
      </p>
      <div className="mt-1 flex items-baseline gap-2 tabular-nums">
        <span className="text-[14px] font-bold text-[#141210]">from £{c.cashFrom.toLocaleString()}</span>
        {c.pointsLabel && <span className="text-[12px] font-semibold text-[#B5603F]">or {c.pointsLabel}</span>}
      </div>
    </Link>
  );
}

export default function NearbyRail({ continent, origin, excludeCode }) {
  const [countries, setCountries] = useState(null);
  useEffect(() => {
    let live = true;
    getExplore(origin)
      .then((d) => {
        if (!live) return;
        const near = (d.countries || [])
          .filter((c) => c.continent === continent && c.code !== excludeCode)
          .sort((a, b) => a.cashFrom - b.cashFrom)
          .slice(0, 4);
        setCountries(near);
      })
      .catch(() => setCountries([]));
    return () => (live = false);
  }, [continent, origin, excludeCode]);

  if (!countries || countries.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="flex-shrink-0 text-[18px] font-bold text-[#141210]">Nearby countries</h2>
        <span className="h-px flex-1 bg-[#E5DFD6]" />
      </div>
      <div className="grid grid-cols-2 gap-x-[1.15rem] gap-y-[1.4rem] sm:grid-cols-3 lg:grid-cols-4">
        {countries.map((c) => (
          <CountryCard key={c.code} c={c} />
        ))}
      </div>
    </div>
  );
}
