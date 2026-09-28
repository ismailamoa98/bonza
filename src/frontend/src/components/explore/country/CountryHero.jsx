// components/explore/country/CountryHero.jsx — Phase 19. Wide country hero: image (heroImageUrl → imageUrl →
// gradient), a scrim, then the flag + name + a meta line bottom-left and a glass 3-stat panel bottom-right
// (which drops beneath the name below 768px).
const ORIGIN_CITY = { LON: "London", MAN: "Manchester", EDI: "Edinburgh", DUB: "Dublin" };

function relativeTime(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  if (diff < 3600000) return "just now";
  if (diff < day) return `${Math.round(diff / 3600000)}h ago`;
  if (diff < 30 * day) return `${Math.round(diff / day)}d ago`;
  return "recently";
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.85px] text-white/60">{label}</p>
      <p className="mt-0.5 truncate text-[16px] font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}

export default function CountryHero({ country, stats, origin, refreshedAt }) {
  if (!country) return <div className="h-[180px] animate-pulse rounded-[20px] bg-[#EFEBE4] md:h-[250px]" />;
  const img = country.heroImageUrl || country.imageUrl;
  const rel = relativeTime(refreshedAt);
  const meta = [
    `${stats?.cityCount ?? 0} ${stats?.cityCount === 1 ? "city" : "cities"} with live prices`,
    `from ${ORIGIN_CITY[origin] || origin}`,
    rel ? `refreshed ${rel}` : null,
  ].filter(Boolean);

  return (
    <div className="relative h-[180px] overflow-hidden rounded-[20px] md:h-[250px]">
      <div className="absolute inset-0" style={{ background: country.gradient }} />
      {img && (
        <img src={img} alt="" onError={(e) => (e.currentTarget.style.display = "none")} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,14,18,.12) 25%, rgba(10,14,18,.68) 100%)" }} />

      <div className="absolute inset-x-5 bottom-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-[26px] font-bold tracking-[-0.8px] text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.45)] md:text-[34px] md:tracking-[-1.1px]">
            <span className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-[#ddd] shadow-[0_0_0_2.5px_rgba(255,255,255,0.9)] md:h-10 md:w-10">
              <img src={`https://flagcdn.com/w80/${country.code}.png`} alt="" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className="h-full w-full object-cover" />
            </span>
            {country.name}
          </h1>
          <p className="mt-1.5 text-[12px] text-white/80 md:text-[13px]">{meta.join(" · ")}</p>
        </div>

        <div className="flex flex-shrink-0 gap-5 rounded-[14px] border border-white/[0.17] bg-white/[0.12] px-4 py-3 backdrop-blur-[18px]">
          <Stat label="Cheapest" value={stats?.cheapestCash != null ? `£${stats.cheapestCash.toLocaleString()}` : "—"} />
          <Stat label="On points" value={stats?.cheapestPointsLabel || "—"} />
          <Stat label="Best month" value={stats?.bestMonthLabel || "—"} />
        </div>
      </div>
    </div>
  );
}
