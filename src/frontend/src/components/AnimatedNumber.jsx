// components/AnimatedNumber.jsx — Count-up to `value` whenever it changes, so the
// recommendation totals animate instead of snapping. Renders the live number via
// `format`. Honors prefers-reduced-motion (jumps straight to the value).
import { useEffect, useRef, useState } from "react";

export default function AnimatedNumber({ value, format = (n) => n, className }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef();

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(to);
      fromRef.current = to;
      return undefined;
    }

    const start = performance.now();
    const duration = 450;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <span className={className}>{format(display)}</span>;
}
