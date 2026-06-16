// components/CardPhoto.jsx — Photo gallery header for the optimize grid cards.
// Loads several keyless LoremFlickr images (a different photo per `lock` seed) the
// user can page through with prev/next arrows + dot indicators. The arrows/dots are
// real <button>s that stopPropagation, so paging never selects the card (the card
// wrapper is a div role="button"). Real photos later: set UNSPLASH_KEY in
// data/packages.js and resolve each slot via fetchImage — no card changes.
// Props: { query, seed, alt, badge, count }.
import { useEffect, useState } from "react";
import { imageUrl } from "../data/packages";

export default function CardPhoto({ query, seed, alt, badge, count = 5 }) {
  const images = Array.from({ length: count }, (_, i) => imageUrl(query, seed + i));
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState({});

  // Reset when the card's photo source changes.
  useEffect(() => {
    setIndex(0);
    setBroken({});
  }, [query, seed]);

  const go = (dir) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIndex((i) => (i + dir + count) % count);
  };
  const jump = (i) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIndex(i);
  };

  return (
    <div className="group/photo relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-bonza-100 to-bonza-light">
      {!broken[index] && (
        <img
          key={index}
          src={images[index]}
          alt={alt}
          loading="lazy"
          onError={() => setBroken((b) => ({ ...b, [index]: true }))}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      {badge}

      {count > 1 && (
        <>
          {/* Prev / next — fade in on hover; stopPropagation so paging never selects the card */}
          <button
            type="button"
            onClick={go(-1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink opacity-0 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:bg-white group-hover/photo:opacity-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={go(1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink opacity-0 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:bg-white group-hover/photo:opacity-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Dot indicators */}
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={jump(i)}
                aria-label={`Photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/60 hover:bg-white/90"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
