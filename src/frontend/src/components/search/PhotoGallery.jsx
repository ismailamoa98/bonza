// components/search/PhotoGallery.jsx — detail-panel header slideshow fed genuine Duffel photos.
// 0 photos → renders nothing (parent gradient shows through); 1 → static image; ≥2 → slideshow with
// prev/next arrows, dot indicator, an "n / N" counter, and ArrowLeft/ArrowRight keyboard paging.
import { useEffect, useState } from "react";

export default function PhotoGallery({ photos = [], alt = "" }) {
  const [i, setI] = useState(0);
  const count = photos.length;
  const has = count > 1;

  const go = (n) => setI((prev) => (n + count) % count);

  // Left/Right arrows page the gallery (Escape stays owned by DetailPanel).
  useEffect(() => {
    if (!has) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === "ArrowRight") go(i + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, has, count]);

  // Preload the neighbours so paging feels instant.
  useEffect(() => {
    if (!has) return;
    [i + 1, i - 1].forEach((n) => {
      const img = new Image();
      img.src = photos[(n + count) % count];
    });
  }, [i, has, count, photos]);

  if (!count) return null;

  return (
    <>
      <img src={photos[i]} alt={alt} className="w-full h-full object-cover" />

      {has && (
        <>
          <ArrowButton side="left" onClick={() => go(i - 1)} />
          <ArrowButton side="right" onClick={() => go(i + 1)} />

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {photos.map((_, n) => (
              <button
                key={n}
                onClick={() => setI(n)}
                aria-label={`Photo ${n + 1}`}
                aria-current={n === i}
                className={`h-1.5 rounded-full transition-all ${
                  n === i ? "w-4 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>

          {/* Counter */}
          <span className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md tabular-nums">
            {i + 1} / {count}
          </span>
        </>
      )}
    </>
  );
}

function ArrowButton({ side, onClick }) {
  const left = side === "left";
  return (
    <button
      onClick={onClick}
      aria-label={left ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 -translate-y-1/2 ${
        left ? "left-3" : "right-3"
      } w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center text-ink-700 hover:text-ink-900 hover:bg-white`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {left ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  );
}
