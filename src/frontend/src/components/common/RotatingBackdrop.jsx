// components/common/RotatingBackdrop.jsx — full-bleed crossfading background images with a slow Ken Burns
// zoom, for the homepage hero. Same pattern as the auth slideshow: each slide is a div (opacity) wrapping
// an img (transform) so the two transitions can run at different speeds. Honours reduced motion; preloads
// the next image; a failed image simply hides (the parent's base colour shows through). Decorative only.
//
// Index can be controlled: pass `activeIndex` (a number) to drive the slide from the parent — then the
// parent owns the timer (e.g. the homepage band's prev/next also steps this) and the internal timer and
// onChange echo are skipped. Omit it for the self-driven mode (own timer + onChange callback).
import { useState, useEffect, useRef } from "react";

export default function RotatingBackdrop({ images = [], intervalMs = 6000, onChange, activeIndex }) {
  const controlled = typeof activeIndex === "number";
  const [internalIndex, setIndex] = useState(0);
  const index = controlled ? activeIndex : internalIndex;
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Self-driven only: notify the parent of the active slide so it can render a synced caption.
  useEffect(() => {
    if (controlled) return;
    onChange?.(internalIndex);
  }, [controlled, internalIndex, onChange]);

  useEffect(() => {
    if (controlled || reduceMotion.current || images.length < 2) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % images.length), intervalMs);
    return () => clearTimeout(t);
  }, [controlled, internalIndex, images.length, intervalMs]);

  // Preload the next image so the crossfade never catches a loading frame.
  useEffect(() => {
    if (images.length < 2) return;
    const img = new Image();
    img.src = images[(index + 1) % images.length];
  }, [index, images]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* One shared slow zoom on the whole stack → overlapping slides share a scale, so the crossfade
          stays crisp (no two-image ghosting/distortion on change). */}
      <div className="absolute inset-0 animate-heroZoom motion-reduce:animate-none">
        {images.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out motion-reduce:duration-200 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={src}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
