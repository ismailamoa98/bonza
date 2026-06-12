// components/PackageCard.jsx — Reusable travel-package card (Plus Jakarta Sans).
// Hierarchy by weight + size + colour: bold dark title -> medium grey subtitle ->
// bold price. Fully prop-driven so it renders mock deck data today and real,
// logged-in results later. Props: { package, fill, seed, onOpen }.
//   onOpen(pkg) fires when the card is clicked.
//   fill — on lg, stretch to the column height (image grows) so the card's bottom
//   aligns with the adjacent form; grid cards (fill=false) stay square.
import { useEffect, useState } from "react";
import { imageUrl, fetchImage } from "../data/packages";
import { formatPoints } from "../utils/format";

// First number group in a string -> integer ("50,000 Avios + £140" -> 50000).
const num = (s) => Number((String(s).match(/[\d,]+/)?.[0] || "0").replace(/,/g, "")) || 0;

export default function PackageCard({ package: pkg, fill = false, seed = 1, onOpen }) {
  // Split "215,000 Bonvoy · 1.4¢/pt" -> amount; ¢/pt is recomputed dynamically below.
  const [ptsAmount] = (pkg.pts || "").split(" · ");
  // Each offer shows its own redemption cost.
  const pointsNum = num(ptsAmount);
  const wasNum = num(pkg.was);
  // Dynamic value: pence of estimated trip value unlocked per point.
  const cpp = pointsNum ? ((wasNum * 100) / pointsNum).toFixed(1) : null;

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
      className={`cursor-pointer font-jakarta ${fill ? "lg:flex lg:h-full lg:flex-col" : ""}`}
    >
      {/* Image area — gradient fallback sits behind the photo. In fill mode it
          grows on lg to push the card bottom down to the column height. */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl ${
          fill ? "aspect-[16/10] lg:aspect-auto lg:min-h-0 lg:flex-1" : "aspect-square"
        }`}
        style={{ background: pkg.grad }}
      >
        {!broken && (
          <img
            src={src}
            alt={pkg.city}
            loading="lazy"
            onError={() => setBroken(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* Date badge */}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-ink shadow-sm">
          📅 {pkg.dates}
        </span>
        {/* Deal rating */}
        <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-[#7BE0A0] shadow-sm">
          ★ {pkg.rate}
        </span>
        {/* Trip name */}
        <span className="absolute bottom-3 left-3 text-[16px] font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
          {pkg.city}
        </span>
      </div>

      {/* Body — sits directly on the cream background (no card surface). */}
      <div className="px-1 pt-3.5">
        {/* Redemption program */}
        <span className="inline-block rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white">
          {pkg.loyalty}
        </span>

        {/* Title -> subtitle hierarchy */}
        <h3 className="mt-3 text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink">
          {pkg.hotel}
        </h3>
        <p className="mt-0.5 text-[13px] font-medium text-ink-soft">{pkg.stars} hotel</p>

        {/* Price — cash + points combination (image #4 style). */}
        <div className="mt-3 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Cash</p>
            <p className="mt-0.5 text-[22px] font-bold tracking-[-0.01em] text-ink">{pkg.cash}</p>
            <p className="text-[11px] text-ink-muted">incl. taxes &amp; fees</p>
          </div>

          <span className="px-1 pt-5 text-[18px] font-bold text-ink-muted">+</span>

          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Points</p>
            <p className="mt-0.5 text-[22px] font-bold tracking-[-0.01em] text-ink">
              {pointsNum ? formatPoints(pointsNum) : ptsAmount}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-[11px] text-ink-muted">pts</span>
              {cpp && (
                <span className="rounded bg-bonza-100 px-1.5 py-0.5 text-[10px] font-bold text-bonza">
                  {cpp}p/pt
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Savings vs estimated total */}
        <p className="mt-2.5 rounded-lg bg-[#E8F5E9] px-3 py-1.5 text-[12px] font-semibold text-[#2E7D32]">
          Save {pkg.save} vs {pkg.was} estimated
        </p>

        {/* Bonza recommendation */}
        <div className="mt-3 rounded-xl bg-[#FBF2EE] p-3">
          <p className="text-[12px] font-bold text-bonza">Bonza recommends</p>
          <p className="mt-0.5 text-[12px] text-ink-soft">{pkg.rec}</p>
        </div>
      </div>
    </div>
  );
}
