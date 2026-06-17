// components/PackageCard.jsx — Editorial "destination card" (Plus Jakarta Sans).
// Text on top (destination, short description, Bonza recommendation, "View package")
// over a photo on the bottom with deal-rating chip, points pill, and the price + save
// overlaid on a gradient scrim. Width is set by the parent (the carousel
// wraps each in a fixed-width track item; the grid uses its cell). Fully prop-driven so
// it renders mock deck data today and real results later. The card shows its OWN price
// (decoupled from the loyalty balance). Props: { package, seed, onOpen }.
import { useEffect, useState } from "react";
import { imageUrl, fetchImage } from "../data/packages";

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// "Jun 23 - Jul 1" -> 8 (nights), handling a year wrap (e.g. "Dec 28 - Jan 3").
function nightCount(dates) {
  const [a, b] = String(dates || "").split(" - ");
  if (!a || !b) return null;
  const parse = (s) => {
    const [mon, day] = s.trim().split(/\s+/);
    return { m: MONTHS[mon?.toLowerCase()?.slice(0, 3)] ?? 0, d: parseInt(day, 10) || 1 };
  };
  const ci = parse(a);
  const co = parse(b);
  const start = Date.UTC(2026, ci.m, ci.d);
  const end = Date.UTC(co.m < ci.m ? 2027 : 2026, co.m, co.d);
  const nights = Math.round((end - start) / 86400000);
  return nights > 0 ? nights : null;
}

export default function PackageCard({ package: pkg, seed = 1, onOpen }) {
  // "9.1 Excellent" -> "9.1" for the deal-rating chip.
  const ratingNum = String(pkg.rate || "").split(/\s+/)[0];
  const nights = nightCount(pkg.dates);
  // "215,000 Bonvoy · 1.4¢/pt" -> points amount (photo pill) + per-point value (text row).
  // The amount splits again into number ("215,000") + currency ("Bonvoy", "Avios + £140").
  const [ptsAmount, ptsRate] = String(pkg.pts || "").split(" · ");
  const [ptsNumber, ptsCurrency] = String(ptsAmount || "").split(/\s+(.+)/);

  // Start with the synchronous LoremFlickr URL; upgrade to Unsplash if a key is set.
  const [src, setSrc] = useState(() => imageUrl(pkg.query, seed));
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let alive = true;
    setBroken(false);
    setSrc(imageUrl(pkg.query, seed));
    fetchImage(pkg.query, seed).then((url) => {
      if (alive && url) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [pkg.query, seed]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(pkg)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen?.(pkg)}
      className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white font-jakarta shadow-[0_10px_35px_rgba(120,80,50,0.10)] transition-shadow hover:shadow-[0_18px_48px_rgba(120,80,50,0.18)]"
    >
      {/* Top text block */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[18px] font-extrabold leading-tight tracking-[-0.01em] text-ink">
          {pkg.city}
        </h3>
        <p className="mt-1 min-h-[2.6em] text-[13px] text-ink-soft line-clamp-2">{pkg.desc}</p>
        {/* Travel dates + stay length */}
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium tabular-nums text-ink-soft">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-muted" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {pkg.dates}
          {nights && ` (${nights} night stay)`}
        </p>
        {/* Per-point redemption value (decoupled from the loyalty balance). Rendered
            even when empty so every panel keeps the exact same height. */}
        <p className="mt-1.5 text-[12px] tabular-nums text-ink-soft">
          {ptsRate ? <><b className="text-[13px] font-bold text-ink">{ptsRate}</b> value</> :" "}
        </p>
        <p className="mt-2 flex min-h-[2.7em] items-start gap-1.5 text-[12px] font-semibold leading-snug text-bonza">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 shrink-0" aria-hidden="true">
            <path d="M12 2l2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2L12 2zM19 15l1.1 2.9L23 19l-2.9 1.1L19 23l-1.1-2.9L15 19l2.9-1.1L19 15z" />
          </svg>
          <span className="line-clamp-2">{pkg.rec}</span>
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[13px] font-bold text-bonza">
          View package
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>

      {/* Bottom image — gradient fallback behind the photo, overlays on a scrim. */}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden" style={{ background: pkg.grad }}>
        {!broken && (
          <img
            src={src}
            alt={pkg.city}
            loading="lazy"
            onError={() => setBroken(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" />

        {/* Deal rating */}
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#1f7a3f]/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />
          </svg>
          {ratingNum}
        </span>
        {/* Points cost (replaces the scheme name; falls back to it if no pts).
            Two lines mirroring the price block: number on top, currency under it. */}
        <div className="absolute bottom-3 left-3 rounded-xl bg-black/55 px-2.5 py-1.5 tabular-nums text-white backdrop-blur-sm">
          <p className="text-[18px] font-extrabold leading-none">{ptsNumber || pkg.loyalty}</p>
          {ptsCurrency && (
            <p className="mt-1 text-[11px] font-bold leading-none text-white/80">{ptsCurrency}</p>
          )}
        </div>
        {/* Price + save */}
        <div className="absolute bottom-3 right-3 text-right tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
          <p className="text-[18px] font-extrabold leading-none text-white">
            {pkg.cash}
            <span className="ml-1.5 text-[12px] font-medium text-white/70 line-through">{pkg.was}</span>
          </p>
          <p className="mt-1 text-[11px] font-bold text-[#7BE0A0]">Save {pkg.save}</p>
        </div>
      </div>
    </div>
  );
}
