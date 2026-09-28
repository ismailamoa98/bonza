// pages/CountryPage.jsx — Phase 19 country page (/explore/:code). Public, crawlable. A stats hero, a controls
// bar whose prices recompute (origin · month · nights · party, staged then applied to the URL), a client-side
// filter/sort row, and sparse city cards that open the §18i CityDrawer. Controls + the open city live in the
// URL so a view is shareable and the back button works. Fed by GET /api/v1/explore/:code.
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { getExploreCountry, apiErrorMessage } from "../utils/api";
import { applyFilters } from "../utils/exploreFilters";
import { useHead } from "../utils/useHead";
import CityDrawer from "../components/explore/CityDrawer";
import CountryHero from "../components/explore/country/CountryHero";
import ControlsBar from "../components/explore/country/ControlsBar";
import FilterRow from "../components/explore/country/FilterRow";
import CityGrid from "../components/explore/country/CityCard";
import NearbyRail from "../components/explore/country/NearbyRail";
import { Breadcrumb, SectionHeader, Icon } from "../components/explore/country/parts";

const ORIGIN_CITY = { LON: "London", MAN: "Manchester", EDI: "Edinburgh", DUB: "Dublin" };
const DEFAULT_FILTERS = { seatsOpen: false, hotelsOnPoints: false, directOnly: false, maxBudget: null, tripType: null };

function EmptyState({ onClear }) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-[16px] bg-[#FAF9F6] px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#B8AFA3] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <Icon name="filterOff" size={26} sw={1.8} />
      </span>
      <p className="mt-4 text-[15px] font-bold text-[#141210]">No cities match these filters</p>
      <p className="mt-1 text-[13px] text-[#8A8078]">Try widening the budget or clearing “award seats open”.</p>
      <button type="button" onClick={onClear} className="mt-4 rounded-full bg-[#141210] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#332B25]">Clear filters</button>
    </div>
  );
}

export default function CountryPage() {
  const { code } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState("cheapest");

  // Dates are held one of two ways in the URL: a `month` (flexible) or a `depart`+`ret` range (specific). The
  // range derives the month + nights the endpoint actually queries; the endpoint itself is date-mode agnostic.
  const departParam = params.get("depart");
  const retParam = params.get("ret");
  const specific = Boolean(departParam && retParam);
  const controls = {
    origin: (params.get("origin") || "LON").toUpperCase(),
    adults: parseInt(params.get("adults") || "2", 10),
    mode: specific ? "specific" : "flexible",
    month: specific ? departParam.slice(0, 7) : params.get("month") || null,
    nights: specific ? Math.max(1, Math.round((new Date(retParam) - new Date(departParam)) / 86400000)) : parseInt(params.get("nights") || "5", 10),
    depart: departParam || null,
    ret: retParam || null,
  };
  const drawerCityId = params.get("city");

  // Refetch only when the pricing controls change — not when the open-city param (`city`) does.
  useEffect(() => {
    setData(null);
    setError(null);
    getExploreCountry(code, controls)
      .then(setData)
      .catch((err) => setError(apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, controls.origin, controls.month, controls.nights, controls.adults]);

  // A country with no priced routes at all → back to the map rather than an empty page.
  useEffect(() => {
    if (data && data.cities.length === 0) navigate("/explore", { replace: true });
  }, [data, navigate]);

  // Small param writer (used for the open-city deep link).
  const update = (patch) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) v == null ? next.delete(k) : next.set(k, String(v));
      return next;
    });

  // Apply the controls draft: writes origin + adults + either month/nights (flexible) or depart/ret (specific),
  // clearing the unused pair so the URL only ever carries one date representation.
  const applyControls = (d) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("origin", d.origin);
      next.set("adults", String(d.adults));
      if (d.mode === "specific" && d.depart && d.ret) {
        next.set("depart", d.depart);
        next.set("ret", d.ret);
        next.delete("month");
        next.delete("nights");
      } else {
        d.month ? next.set("month", d.month) : next.delete("month");
        next.set("nights", String(d.nights));
        next.delete("depart");
        next.delete("ret");
      }
      return next;
    });

  const originCity = ORIGIN_CITY[controls.origin] || controls.origin;
  const visible = useMemo(() => applyFilters(data?.cities ?? [], filters, sort), [data, filters, sort]);

  // SEO — the app's only head-managed page. Canonical drops origin/dates; JSON-LD deep-links each city.
  const canonicalBase = typeof window !== "undefined" ? window.location.origin : "";
  useHead(
    data?.country
      ? {
          title: `Flights and hotels to ${data.country.name} from ${originCity} | Bonza`,
          description: `${data.country.blurb ? data.country.blurb + " " : ""}Compare ${data.stats.cityCount} cities in cash or points, with live award availability from ${originCity}.`,
          canonical: `${canonicalBase}/explore/${code}`,
          ogImage: data.country.heroImageUrl || data.country.imageUrl || undefined,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Cities in ${data.country.name}`,
            itemListElement: (data.cities || []).map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.name,
              url: `${canonicalBase}/explore/${code}?city=${c.id}`,
            })),
          },
        }
      : { title: "Explore | Bonza" }
  );

  if (error) {
    return (
      <div className="mx-auto max-w-[680px] px-8 py-24 text-center">
        <p className="text-[15px] text-[#6a6258]">We couldn’t find that country.</p>
        <button type="button" onClick={() => navigate("/explore")} className="mt-4 text-[13px] font-semibold text-bonza hover:text-bonza-dark">← Back to Explore</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <div className="mx-auto max-w-[1140px] px-5 pb-16 pt-6 tabular-nums sm:px-8">
        <Breadcrumb country={data?.country} />
        <CountryHero country={data?.country} stats={data?.stats} origin={controls.origin} refreshedAt={data?.refreshedAt} />
        <ControlsBar controls={controls} onApply={applyControls} />

        {!data ? (
          <div className="mt-8 grid grid-cols-1 gap-x-[1.15rem] gap-y-[1.4rem] sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-[3/2] rounded-[15px] bg-[#EFEBE4]" />
            ))}
          </div>
        ) : (
          <>
            <FilterRow filters={filters} onChange={setFilters} sort={sort} onSort={setSort} tripTypes={data.tripTypes ?? []} />
            <SectionHeader name={data.country.name} count={visible.length} />
            {visible.length === 0 ? (
              <EmptyState onClear={() => setFilters(DEFAULT_FILTERS)} />
            ) : (
              <CityGrid cities={visible} nights={controls.nights} gradient={data.country.gradient} onOpen={(id) => update({ city: id })} />
            )}
            {data.cities.length <= 2 && (
              <NearbyRail continent={data.country.continent} origin={controls.origin} excludeCode={data.country.code} />
            )}
          </>
        )}
      </div>

      {drawerCityId && (
        <CityDrawer
          cityId={drawerCityId}
          origin={controls.origin}
          trip={{ mode: controls.mode, month: controls.month, nights: controls.nights, depart: controls.depart, ret: controls.ret, adults: controls.adults }}
          onClose={() => update({ city: null })}
        />
      )}
    </div>
  );
}
