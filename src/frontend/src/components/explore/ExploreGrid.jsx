// components/explore/ExploreGrid.jsx — Phase 18. The same data as a crawlable 4-across card grid, grouped by
// continent. This is the canonical SEO view (and the forced mobile view); each card links to /explore/:code.
import { Link } from "react-router-dom";

function CountryCard({ c }) {
  return (
    <Link to={`/explore/${c.code}`} className="group block">
      <div className="relative mb-2.5 aspect-[3/2] overflow-hidden rounded-[14px]">
        <div className="absolute inset-0" style={{ background: c.gradient }} />
        {c.imageUrl && (
          <img
            src={c.imageUrl}
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = "none")}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
        {c.awardSeatsOpen && (
          <span className="absolute left-[0.7rem] top-[0.7rem] rounded-md bg-[#9FE9BB] px-2 py-[3px] text-[10.5px] font-bold text-[#0F2E1C]">
            Seats open
          </span>
        )}
      </div>
      <p className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.2px] text-[#141210]">
        <span className="h-[16px] w-[16px] flex-shrink-0 overflow-hidden rounded-full bg-[#e6e6e6]">
          <img src={`https://flagcdn.com/w40/${c.code}.png`} alt="" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className="h-full w-full object-cover" />
        </span>
        {c.name}
      </p>
      <p className="mt-0.5 text-[12px] text-[#8A8078]">
        {c.cityCount} {c.cityCount === 1 ? "city" : "cities"}
      </p>
      <div className="mt-1 flex items-baseline gap-2 tabular-nums">
        <span className="text-[14px] font-bold text-[#141210]">from £{c.cashFrom.toLocaleString()}</span>
        {c.pointsLabel && (
          <>
            <span className="text-[11px] text-[#B8AFA3]">or</span>
            <span className="text-[12px] font-semibold text-[#B5603F]">{c.pointsLabel}</span>
          </>
        )}
      </div>
    </Link>
  );
}

export default function ExploreGrid({ countries, continents, loading }) {
  if (loading) {
    return (
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/2] rounded-[14px] bg-[#EFEBE4]" />
        ))}
      </div>
    );
  }

  const order = continents.map((c) => c.name);
  return (
    <div className="mt-6">
      {order.map((name) => {
        const inContinent = countries.filter((c) => c.continent === name);
        if (!inContinent.length) return null;
        return (
          <section key={name} className="mb-9">
            <h2 className="mb-3 flex items-center gap-3 text-[13px] font-bold uppercase tracking-[0.14em] text-bonza">
              {name}
              <span className="text-[11px] font-semibold text-[#B8AFA3]">{inContinent.length}</span>
              <span className="h-px flex-1 bg-[#EFEBE4]" />
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {inContinent.map((c) => (
                <CountryCard key={c.code} c={c} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
