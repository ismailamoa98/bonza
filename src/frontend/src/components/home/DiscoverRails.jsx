// components/home/DiscoverRails.jsx — Phase 18 (§18e). Two image-led rails: explore-by-country and an
// origin-aware popular-trips rail. Data from the public /destinations/discover endpoint (origin resolved
// server-side). Cards scroll-snap with hidden scrollbars; arrows show at md+. Inline SVG icons (no webfont).
import { useRef, useEffect, useState } from "react";
import { getDiscover } from "../../utils/api";
import TripCard from "./TripCard";

function ChevronIcon({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir < 0 ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

function Rail({ title, subtitle, children }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-[1.15rem]">
        <div>
          <h2 className="text-[2rem] font-bold text-[#141210] tracking-[-0.02em] mb-1">{title}</h2>
          <p className="text-[14px] text-[#7A7269]">{subtitle}</p>
        </div>
        <div className="hidden md:flex gap-[0.45rem]">
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => scroll(d)}
              aria-label={d < 0 ? "Scroll left" : "Scroll right"}
              className="w-9 h-9 rounded-full border border-[#E5DFD6] bg-white flex items-center justify-center text-[#4A423B] hover:border-[#C9C0B4] hover:bg-[#FAF8F5] transition-all"
            >
              <ChevronIcon dir={d} />
            </button>
          ))}
        </div>
      </div>
      <div
        ref={ref}
        className="grid grid-flow-col auto-cols-[78%] sm:auto-cols-[46%] lg:auto-cols-[calc((100%-3*0.9rem)/4)] gap-[0.9rem] overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}

function CountryCard({ country }) {
  return (
    <a
      href={`/explore/${country.code}`}
      className="relative aspect-[4/5] rounded-2xl overflow-hidden snap-start group cursor-pointer"
    >
      <div className="absolute inset-0" style={{ background: country.gradient }} />
      <img
        src={country.imageUrl}
        alt=""
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      {/* Bottom scrim only — the top of the image stays clean. Ramps early and reaches near-opaque at the
          base so the label band reads the SAME on a bright photo (Maldives water) as on a dark one, rather
          than the scrim only muting bright images to a pale teal. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,14,18,0) 30%, rgba(10,14,18,.45) 60%, rgba(10,14,18,.9) 100%)",
        }}
      />
      {/* Price badge — top-right corner, separated from the name so a long/single-word country name can
          never collide with it. */}
      {country.fromLabel && (
        <span className="absolute top-[0.85rem] right-[0.85rem] z-[2] text-[11px] font-bold text-[#141210] bg-white/[0.92] px-[9px] py-1 rounded-full whitespace-nowrap tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.18)]">
          {country.fromLabel}
        </span>
      )}
      {/* Flag + name own the whole bottom row and wrap to a second line when long. */}
      <span className="absolute left-[1.1rem] right-[1.1rem] bottom-[1.05rem] z-[2] flex items-center gap-[9px] text-[19px] font-bold leading-[1.12] text-white tracking-[-0.3px] [text-shadow:0_1px_5px_rgba(0,0,0,0.55)]">
        <span className="w-[26px] h-[26px] rounded-full overflow-hidden flex-shrink-0 bg-[#ddd] shadow-[0_0_0_2px_rgba(255,255,255,0.85)]">
          <img src={`https://flagcdn.com/w80/${country.code}.png`} alt="" className="w-full h-full object-cover" />
        </span>
        <span className="min-w-0">{country.name}</span>
      </span>
    </a>
  );
}

function AnywhereCard() {
  // Opens the Explore Everywhere map — every reachable country with cash/points pricing.
  const href = "/explore";
  const copy = "Explore every country on the map";

  return (
    <a
      href={href}
      className="relative aspect-[4/5] rounded-2xl overflow-hidden snap-start cursor-pointer flex flex-col items-center justify-center text-center p-6"
      style={{ background: "linear-gradient(160deg,#DA7756,#B8573A)" }}
    >
      {/* Concentric rings — decorative, keeps the tile from reading flat */}
      <span className="absolute w-[220px] h-[220px] rounded-full border border-white/[0.18] -top-[60px] -right-[70px]" />
      <span className="absolute w-[160px] h-[160px] rounded-full border border-white/[0.14] -bottom-[50px] -left-[40px]" />
      <span className="w-16 h-16 rounded-full bg-white/[0.16] flex items-center justify-center mb-[1.1rem] relative z-[2]">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
        </svg>
      </span>
      <p className="text-[20px] font-bold text-white tracking-[-0.4px] mb-[5px] relative z-[2]">Anywhere</p>
      <p className="text-[13.5px] text-white/[0.86] leading-[1.45] relative z-[2]">{copy}</p>
    </a>
  );
}

function RailsSkeleton() {
  return (
    <div className="max-w-[1080px] mx-auto px-8 py-4" aria-hidden="true">
      {[0, 1].map((r) => (
        <div key={r} className="mb-12">
          <div className="h-6 w-52 rounded bg-[#EFEBE4] mb-2" />
          <div className="h-4 w-72 rounded bg-[#F2EFEA] mb-[1.15rem]" />
          <div className="grid grid-flow-col auto-cols-[78%] sm:auto-cols-[46%] lg:auto-cols-[calc((100%-3*0.9rem)/4)] gap-[0.9rem] overflow-hidden">
            {[0, 1, 2, 3].map((c) => (
              <div key={c} className={`${r === 0 ? "aspect-[4/5] rounded-2xl" : "aspect-[4/3] rounded-[14px]"} bg-[#EFEBE4]`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DiscoverRails() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getDiscover()
      .then(setData)
      .catch(() => setData({ countries: [], trips: [], origin: { city: "London" }, isAuthenticated: false, heldProgrammeCount: 0 }));
  }, []);

  if (!data) return <RailsSkeleton />;

  const { countries, trips, origin } = data;

  return (
    <div className="max-w-[1080px] mx-auto px-8 py-4">
      <Rail title="Explore by country" subtitle={`Where your points go furthest from ${origin.city}`}>
        {countries.map((c) => (
          <CountryCard key={c.code} country={c} />
        ))}
        <AnywhereCard />
      </Rail>

      {trips.length > 0 && (
        <Rail title={`Popular trips from ${origin.city}`} subtitle="Flight and hotel together, priced in cash or points">
          {trips.map((t) => (
            <TripCard key={t.id} trip={t} />
          ))}
        </Rail>
      )}
    </div>
  );
}
