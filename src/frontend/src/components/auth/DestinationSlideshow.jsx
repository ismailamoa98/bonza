// components/auth/DestinationSlideshow.jsx — the left panel of the auth pages: a crossfading destination
// slideshow with a slow Ken Burns zoom and a caption carrying Bonza's points proposition. Inline SVG icons
// (no webfont). Honours prefers-reduced-motion; preloads the next image; a failed image falls back to its
// gradient (never a black panel). `heading`/`body` default to the sign-in copy; sign-up passes a variant.
import { useState, useEffect, useRef, useCallback } from "react";
import { AUTH_DESTINATIONS, SLIDE_DURATION_MS } from "../../data/authDestinations";

const DEFAULT_HEADING = (
  <>
    Welcome <em className="not-italic text-[#F2BC9F]">back</em>
  </>
);
const DEFAULT_BODY =
  "Your points are still working. Sign in to pick up your trips, balances and best-value packages.";

function ChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function MapPin() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function DestinationSlideshow({ heading = DEFAULT_HEADING, body = DEFAULT_BODY }) {
  const [index, setIndex] = useState(0);
  const [captionVisible, setCaption] = useState(true);
  const timerRef = useRef(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const goTo = useCallback(
    (next) => {
      if (next === index) return;
      // Fade the caption out, swap content, fade back in.
      setCaption(false);
      setTimeout(
        () => {
          setIndex(next);
          setCaption(true);
        },
        reduceMotion.current ? 0 : 450
      );
    },
    [index]
  );

  // Auto-advance (off under reduced motion).
  useEffect(() => {
    if (reduceMotion.current) return undefined;
    timerRef.current = setTimeout(() => goTo((index + 1) % AUTH_DESTINATIONS.length), SLIDE_DURATION_MS);
    return () => clearTimeout(timerRef.current);
  }, [index, goTo]);

  // Preload the next image so the crossfade never catches a loading frame.
  useEffect(() => {
    const next = AUTH_DESTINATIONS[(index + 1) % AUTH_DESTINATIONS.length];
    const img = new Image();
    img.src = next.image;
  }, [index]);

  const current = AUTH_DESTINATIONS[index];

  return (
    <div className="relative h-full overflow-hidden bg-[#16211F] flex flex-col justify-between p-9">
      {/* Stacked slides — all mounted, opacity switched */}
      {AUTH_DESTINATIONS.map((d, i) => (
        <div
          key={d.slug}
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out motion-reduce:duration-200 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-0" style={{ background: d.grad }} />
          <img
            src={d.image}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className={`w-full h-full object-cover transition-transform duration-[9000ms] ease-linear motion-reduce:transform-none motion-reduce:duration-0 ${
              i === index ? "scale-100" : "scale-[1.06]"
            }`}
          />
        </div>
      ))}

      {/* Scrim — four stops so text stays legible over any image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(178deg, rgba(14,22,21,.50) 0%, rgba(14,22,21,.18) 34%, rgba(14,22,21,.55) 66%, rgba(14,22,21,.90) 100%)",
        }}
      />

      {/* Back to marketing site */}
      <a
        href="/"
        className="relative z-10 self-start inline-flex items-center gap-[7px] text-[13px] font-semibold text-white/[0.94] bg-white/[0.13] backdrop-blur-[10px] border border-white/20 px-[15px] py-2 pl-3 rounded-full hover:bg-white/[0.22] transition-colors"
      >
        <ChevronLeft />
        Back to Bonza
      </a>

      <div className="relative z-10 max-w-[440px]">
        {/* Wordmark */}
        <div className="flex items-center gap-[11px] mb-[1.4rem]">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-bonza text-white flex items-center justify-center font-display text-[17px] font-semibold">
            B
          </div>
          <span className="font-display text-[19px] font-semibold text-white tracking-[-0.2px]">Bonza</span>
        </div>

        <h1 className="font-display text-[2.55rem] font-semibold text-white tracking-[-1px] leading-[1.08] mb-[0.8rem]">
          {heading}
        </h1>
        <p className="text-[15px] text-white/[0.76] leading-[1.6] mb-[1.6rem] max-w-[400px]">{body}</p>

        {/* Destination caption */}
        <div className="flex items-center gap-[11px] mb-[1.35rem] min-h-[24px]">
          <div className="w-[22px] h-[22px] rounded-[7px] bg-white/[0.16] backdrop-blur-[8px] flex items-center justify-center flex-shrink-0 text-white/90">
            <MapPin />
          </div>
          <div
            className={`transition-all duration-[550ms] ${
              captionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[5px]"
            }`}
          >
            <p className="text-[14px] font-semibold text-white tracking-[-0.1px]">{current.name}</p>
          </div>
        </div>

        {/* Progress bars */}
        <div className="flex gap-[5px] pt-[1.3rem] border-t border-white/15">
          {AUTH_DESTINATIONS.map((d, i) => (
            <button
              key={d.slug}
              onClick={() => goTo(i)}
              aria-label={`Show ${d.name}`}
              className="flex-1 h-[2.5px] rounded-sm bg-white/[0.22] overflow-hidden cursor-pointer"
            >
              <div
                key={`${d.slug}-${index}`} // remount to restart the animation
                className={`h-full rounded-sm bg-white/[0.92] ${i < index ? "w-full" : "w-0"} ${
                  i === index ? "animate-slideProgress" : ""
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
