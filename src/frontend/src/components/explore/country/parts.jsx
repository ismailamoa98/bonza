// components/explore/country/parts.jsx — Phase 19 shared bits: inline-SVG icons, a Popover primitive (used by
// the controls + filters), the breadcrumb and the section header. Inline SVG only — no icon library.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const P = {
  chevDown: ["M6 9l6 6 6-6"],
  chevRight: ["M9 6l6 6-6 6"],
  plane: ["M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-.9.3l-.6.6a1 1 0 0 0 .1 1.5L9 12l-2 3H4l-1.5 1.5L6 19l2.5 3.5L10 21v-3l3-2 1.5 4.7a1 1 0 0 0 1.6.4l.6-.6a1 1 0 0 0 .3-.9Z"],
  bed: ["M2 4v16", "M2 8h18a2 2 0 0 1 2 2v10", "M2 17h20", "M6 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"],
  refresh: ["M3 12a9 9 0 0 1 15-6.7L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15 6.7L3 16", "M3 21v-5h5"],
  filterOff: ["M3 3l18 18", "M21 4H8", "M10 8H3l7 8v5l4-2v-1"],
  sort: ["M3 7h12", "M3 12h9", "M3 17h6", "M17 4v16", "M14 17l3 3 3-3"],
  minus: ["M5 12h14"],
  plus: ["M12 5v14", "M5 12h14"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  check: ["M20 6 9 17l-5-5"],
};

export function Icon({ name, size = 16, sw = 2, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {(P[name] || []).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

// A click-and-Esc-dismissed dropdown anchored to its trigger. `render` receives a `close` fn.
export function Popover({ trigger, children, align = "left", panelClass = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger(open, () => setOpen((v) => !v))}
      {open && (
        <div className={`absolute z-30 mt-2 rounded-[14px] border border-[#E8E3DC] bg-white p-3 shadow-[0_16px_40px_rgba(12,16,18,0.16)] ${align === "right" ? "right-0" : "left-0"} ${panelClass}`}>
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

export function Breadcrumb({ country }) {
  const sep = <Icon name="chevRight" size={13} sw={2.2} className="text-[#C4BCB2]" />;
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-[13px] font-semibold">
      <Link to="/explore" className="text-[#8A8078] hover:text-[#141210]">Explore</Link>
      {country?.continent && (
        <>
          {sep}
          <Link to="/explore" className="text-[#8A8078] hover:text-[#141210]">{country.continent}</Link>
        </>
      )}
      {country?.name && (
        <>
          {sep}
          <span className="text-[#141210]">{country.name}</span>
        </>
      )}
    </nav>
  );
}

export function SectionHeader({ name, count }) {
  return (
    <div className="mb-4 mt-8 flex items-center gap-3">
      <h2 className="flex-shrink-0 text-[18px] font-bold text-[#141210]">Cities in {name}</h2>
      <span className="flex-shrink-0 text-[13px] text-[#8A8078] tabular-nums">{count} {count === 1 ? "city" : "cities"}</span>
      <span className="h-px flex-1 bg-[#E5DFD6]" />
    </div>
  );
}
