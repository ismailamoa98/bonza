// components/SnapSection.jsx — A content-height "slide" for the homepage.
// Sized to its content (not the full viewport) so gaps between slides stay tight;
// the parent <html> carries a soft `scroll-snap-type: proximity` while HomePage is
// mounted, so scrolling gently snaps to section tops while neighbors can peek. Each
// section fades + rises its content into view the first time it lands. The section
// box stays static for snapping; only the inner div animates. Honors
// prefers-reduced-motion. Props: { id, className, wide, inline } — `wide` swaps the
// boxed max-w-7xl container for a near-full-bleed one (used by the packages
// carousel); `inline` drops the section padding + centered container so the reveal
// can wrap a card inside an existing layout column (used by the optimize page).
import { useEffect, useRef, useState } from "react";

export default function SnapSection({ id, className = "", wide = false, inline = false, children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return undefined;
    }
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id={id}
      ref={ref}
      className={inline ? "snap-start" : "snap-start scroll-mt-16 py-16 sm:py-20"}
    >
      <div
        className={`${
          inline
            ? "w-full"
            : `mx-auto w-full ${wide ? "max-w-[110rem] px-6 sm:px-10" : "max-w-7xl px-6"}`
        } transition-all duration-700 ease-out ${
          shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        } ${className}`}
      >
        {children}
      </div>
    </section>
  );
}
