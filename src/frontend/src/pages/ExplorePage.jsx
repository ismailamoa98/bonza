// pages/ExplorePage.jsx — Phase 18 Explore Everywhere. Split map + list browse of every reachable country
// with cash/points pricing from an origin, linked two-way on hover; a grid fallback for comparison/SEO/mobile.
// Clicking a country (a map pin or a list row) opens that country's /explore/:code page.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getExplore, apiErrorMessage } from "../utils/api";
import ExploreHeader from "../components/explore/ExploreHeader";
import ExploreMap from "../components/explore/ExploreMap";
import ExplorePanel from "../components/explore/ExplorePanel";
import ExploreGrid from "../components/explore/ExploreGrid";
import { useHead } from "../utils/useHead";
import { canonicalUrl } from "../utils/siteUrl";

const isNarrow = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

export default function ExplorePage() {
  const navigate = useNavigate();
  useHead({
    title: "Explore destinations — cheapest cash & points trips | Bonza",
    description:
      "Browse every destination by price from your home airport, see which trips are bookable on points, and open any country for cities, hotels and award availability.",
    canonical: canonicalUrl("/explore"),
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("map"); // 'map' | 'grid'
  const [hovered, setHovered] = useState(null); // country code
  const [origin, setOrigin] = useState("LON");
  const [narrow, setNarrow] = useState(isNarrow());

  // A world map in a phone viewport isn't usable — force the grid and hide the toggle below 768px.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const load = (o) => {
    setData(null);
    setError(null);
    getExplore(o)
      .then((d) => {
        setData(d);
        setOrigin(d.origin);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("origin");
    if (q) setOrigin(q.toUpperCase());
    load(q || undefined);
  }, []);

  const countries = data?.countries ?? [];
  const openCountry = (code) => navigate(`/explore/${code}?origin=${origin}`);
  const effectiveView = narrow ? "grid" : view;

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-[1280px] px-8 pb-10 pt-6">
        <ExploreHeader
          origin={origin}
          total={data?.total}
          view={effectiveView}
          showToggle={!narrow}
          onView={setView}
          onOrigin={(code) => {
            setOrigin(code);
            load(code);
          }}
        />

        {error && <p className="mt-6 text-[13px] text-red-500">{error}</p>}

        {effectiveView === "map" ? (
          <div className="mt-4 grid h-[640px] grid-cols-1 gap-[1.15rem] lg:grid-cols-[1.15fr_1fr]">
            <ExploreMap
              countries={countries}
              hovered={hovered}
              onSelect={openCountry}
              onHover={setHovered}
            />
            <ExplorePanel
              countries={countries}
              hovered={hovered}
              loading={!data && !error}
              onSelect={openCountry}
              onHover={setHovered}
            />
          </div>
        ) : (
          <ExploreGrid countries={countries} continents={data?.continents ?? []} loading={!data && !error} />
        )}
      </div>
    </div>
  );
}
