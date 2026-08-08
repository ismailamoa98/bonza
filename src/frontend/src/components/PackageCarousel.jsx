// components/PackageCarousel.jsx — "Explore your packages" deck.
// A horizontal snap carousel (three full cards + a peek of the next) with prev/next
// arrows and a 10s auto-advance, plus a "View all" toggle that expands the deck into
// a grid. Shared by the public homepage and the logged-in dashboard so the two stay
// identical. Reduced-motion pauses the auto-advance. Props:
//   { packages, seed, onOpen, eyebrow, title }
import { useEffect, useRef, useState } from "react";
import PackageCard from "./PackageCard";

export default function PackageCarousel({
  packages,
  seed,
  onOpen,
  eyebrow = "Personalized for you",
  title = "Explore your packages",
}) {
  const [showAll, setShowAll] = useState(false);
  const trackRef = useRef(null);

  const scrollByCard = (dir = 1) => {
    const el = trackRef.current;
    if (!el) return;
    const step = (el.firstElementChild?.offsetWidth || 288) + 20;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    el.scrollTo({ left: dir > 0 && atEnd ? 0 : el.scrollLeft + dir * step, behavior: "smooth" });
  };

  // 10s auto-advance — off under reduced motion and while expanded into the grid.
  useEffect(() => {
    if (showAll) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setInterval(() => scrollByCard(1), 10000);
    return () => clearInterval(id);
  }, [packages, showAll]);

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bonza">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-[2rem] font-medium tracking-[-0.02em] text-ink">{title}</h2>
        </div>
        {/* No dedicated all-packages route yet — expands the deck into a grid. */}
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-1.5 pb-1 text-[13px] font-bold text-[#b5603f] hover:text-bonza-dark"
        >
          {showAll ? "Show less" : "View all"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      {showAll ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard key={pkg.city} package={pkg} seed={seed} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div className="relative mt-8">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Previous packages"
            className="absolute -left-0.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-soft shadow-[0_6px_20px_rgba(40,30,20,0.16)] ring-1 ring-black/5 hover:text-bonza"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {packages.map((pkg) => (
              // Sized so three full cards fit plus a 5rem sliver of the fourth
              // peeking at the right edge (3 cards + 3 gap-5 gutters + 5rem = 100%).
              <div
                key={pkg.city}
                className="w-80 shrink-0 snap-start sm:w-96 lg:w-[calc((100%-8.75rem)/3)]"
              >
                <PackageCard package={pkg} seed={seed} onOpen={onOpen} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Next packages"
            className="absolute -right-0.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-soft shadow-[0_6px_20px_rgba(40,30,20,0.16)] ring-1 ring-black/5 hover:text-bonza"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
