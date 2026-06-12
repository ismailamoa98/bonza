// components/PackageCard.jsx — Editorial "destination card" (Plus Jakarta Sans).
// Text on top (destination, short description, Bonza recommendation, "View package")
// over a photo on the bottom with date badge, deal-rating chip, loyalty pill, and the
// price + save overlaid on a gradient scrim. Width is set by the parent (the carousel
// wraps each in a fixed-width track item; the grid uses its cell). Fully prop-driven so
// it renders mock deck data today and real results later. The card shows its OWN price
// (decoupled from the loyalty balance). Props: { package, seed, onOpen }.
import { useEffect, useState } from "react";
import { imageUrl, fetchImage } from "../data/packages";

export default function PackageCard({ package: pkg, seed = 1, onOpen }) {
  // "9.1 Excellent" -> "9.1" for the deal-rating chip.
  const ratingNum = String(pkg.rate || "").split(/\s+/)[0];

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
        <p className="mt-1 text-[13px] text-ink-soft">{pkg.desc}</p>
        {/* Own redemption offer (decoupled from the loyalty balance). */}
        {pkg.pts && (
          <p className="mt-1.5 text-[12px] font-medium tabular-nums text-ink-muted">or {pkg.pts}</p>
        )}
        <p className="mt-2 text-[12px] font-semibold leading-snug text-bonza">🤖 {pkg.rec}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-bonza">
          View package
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>

      {/* Bottom image — gradient fallback behind the photo, overlays on a scrim. */}
      <div className="relative h-44 w-full overflow-hidden" style={{ background: pkg.grad }}>
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

        {/* Date badge */}
        <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-medium text-ink shadow-sm">
          📅 {pkg.dates}
        </span>
        {/* Deal rating */}
        <span className="absolute right-3 top-3 rounded-full bg-[#1f7a3f]/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
          ★ {ratingNum}
        </span>
        {/* Loyalty program */}
        <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          {pkg.loyalty}
        </span>
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
