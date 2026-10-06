// components/AirportDropdown.jsx — Searchable airport input (live API).
// Debounces keystrokes, queries GET /airports?q=, and shows matching airports to pick from — grouped into a
// metro hierarchy: a city served by several airports gets an "All {city} airports" parent row (selecting it
// uses the metro code, e.g. LON, so Duffel returns fares across all of them) with the member airports nested
// under a connector line. Calls onSelect with the chosen airport (or the metro); the parent stores the code.
// Props: { label, placeholder, displayLabel, onSelect, onQueryChange, bare }.
//   bare — borderless/transparent input for the horizontal hero search "bar".
//   onQueryChange — reports the raw typed text so the parent can resolve a typed-but-unselected airport.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getAirports, apiErrorMessage } from "../utils/api";

// Split a label around the (case-insensitive) query and wrap the match in a terra <mark> for emphasis.
function Highlight({ text, query }) {
  const q = (query || "").trim();
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-bonza">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

// Flatten API results into an ordered list of rows: a metro parent (when a cityCode has ≥2 airports) followed
// by its airports as children; single-airport cities become one flat row. Order follows first appearance.
function toRows(results) {
  const groups = new Map(); // cityCode → { city, country, state, airports[] }
  const order = [];
  for (const a of results) {
    const key = a.cityCode || `${a.city}|${a.countryCode}`;
    if (!groups.has(key)) {
      groups.set(key, { code: a.cityCode || a.code, city: a.city, country: a.country, state: a.state || null, airports: [] });
      order.push(key);
    }
    groups.get(key).airports.push(a);
  }
  const rows = [];
  for (const key of order) {
    const g = groups.get(key);
    if (g.airports.length > 1) {
      rows.push({ kind: "metro", code: g.code, city: g.city, country: g.country, state: g.state, name: `All ${g.city} airports`, count: g.airports.length });
      g.airports.forEach((a) => rows.push({ kind: "child", ...a }));
    } else {
      rows.push({ kind: "flat", ...g.airports[0] });
    }
  }
  return rows;
}

const PLANE = "M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-.9.3l-.6.6a1 1 0 0 0 .1 1.5L9 12l-2 3H4l-1.5 1.5L6 19l2.5 3.5L10 21v-3l3-2 1.5 4.7a1 1 0 0 0 1.6.4l.6-.6a1 1 0 0 0 .3-.9Z";
const GLOBE = ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M3.6 9h16.8", "M3.6 15h16.8", "M12 3c2.5 2.4 3.9 5.6 4 9-.1 3.4-1.5 6.6-4 9-2.5-2.4-3.9-5.6-4-9 .1-3.4 1.5-6.6 4-9Z"];

function IconTile({ metro }) {
  return (
    <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${metro ? "bg-bonza-100 text-bonza" : "bg-[#F2EFEA] text-ink-soft"}`}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {metro ? GLOBE.map((d, i) => <path key={i} d={d} />) : <path d={PLANE} />}
      </svg>
    </span>
  );
}

function Chip({ code }) {
  return (
    <span className="flex-shrink-0 rounded-md border border-[#e5ded3] bg-[#faf8f4] px-1.5 py-0.5 text-[11px] font-bold tracking-[0.02em] text-ink tabular-nums">
      {code}
    </span>
  );
}

export default function AirportDropdown({ label, placeholder, displayLabel, onSelect, onQueryChange, bare = false, tone = "light", size = "md" }) {
  const dark = tone === "dark";
  const lg = size === "lg";
  const [query, setQuery] = useState(displayLabel || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false); // user typed since last selection
  const [pos, setPos] = useState(null); // fixed-position rect for the portalled menu
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  // The menu renders in a portal (to escape the hero's overflow-hidden clip), so position it against the
  // input's viewport rect — recomputed while open, on scroll and on resize.
  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.min(420, window.innerWidth - 16);
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      setPos({ top: r.bottom + 4, left, width });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // Reflect an externally-set selection (e.g. restored from store).
  useEffect(() => {
    if (displayLabel && !dirty) setQuery(displayLabel);
  }, [displayLabel, dirty]);

  // Debounced live search as the user types.
  useEffect(() => {
    if (!dirty) return undefined;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const airports = await getAirports(q);
        setResults(airports);
        setError(null);
        setOpen(true);
      } catch (err) {
        setError(apiErrorMessage(err));
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, dirty]);

  // Close the dropdown when clicking outside (the menu is portalled, so check it too).
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const rows = useMemo(() => toRows(results), [results]);

  const choose = (row) => {
    if (row.kind === "metro") {
      onSelect({ code: row.code, city: row.city, country: row.country, metro: true });
      setQuery(`All ${row.city} airports`);
    } else {
      onSelect({ code: row.code, city: row.city, country: row.country, countryCode: row.countryCode });
      setQuery(`${row.code} — ${row.city}`);
    }
    onQueryChange?.(""); // committed — clear any pending typed text
    setResults([]);
    setOpen(false);
    setDirty(false);
  };

  // Enter commits the first row (the metro parent when present, else the top airport).
  const onKeyDown = (e) => {
    if (e.key === "Enter" && open && rows.length > 0) {
      e.preventDefault();
      choose(rows[0]);
    }
  };

  return (
    <label className="relative block" ref={boxRef}>
      <span className={`mb-1 block font-semibold uppercase tracking-[0.08em] ${lg ? "text-[11px]" : "text-[10px]"} ${dark ? "text-white/45" : "text-ink-muted"}`}>{label}</span>
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          onQueryChange?.(e.target.value);
          setDirty(true);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => rows.length && setOpen(true)}
        className={
          bare
            ? `w-full bg-transparent font-semibold placeholder:font-normal focus:outline-none ${lg ? "text-[16px]" : "text-[14px]"} ${dark ? "text-white placeholder:text-white/45" : "text-ink placeholder:text-ink-muted"}`
            : "w-full rounded-lg border border-[#e3ded6] bg-white px-3 py-2.5 text-[13px] text-ink focus:border-bonza focus:outline-none"
        }
      />

      {open && pos && (loading || rows.length > 0 || error) &&
        createPortal(
        <ul
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-[60] max-h-80 overflow-auto rounded-xl border border-[#e0d9cf] bg-white py-1 font-jakarta shadow-[0_16px_38px_rgba(40,30,20,0.16)]"
        >
          {loading && <li className="px-3 py-2.5 text-sm text-ink-muted">Searching…</li>}
          {error && !loading && <li className="px-3 py-2.5 text-sm text-amber-600">{error}</li>}
          {!loading &&
            rows.map((row) => {
              const secondary =
                row.kind === "metro"
                  ? `${row.count} airports · ${[row.state, row.country].filter(Boolean).join(", ")}`
                  : `${row.city} · ${[row.state, row.country].filter(Boolean).join(", ")}`;
              return (
                <li key={`${row.kind}-${row.code}-${row.city}`}>
                  <button
                    type="button"
                    onClick={() => choose(row)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-bonza-50 ${row.kind === "child" ? "pl-3" : ""}`}
                  >
                    {row.kind === "child" && <span aria-hidden="true" className="ml-1 mr-0.5 h-8 w-3 flex-shrink-0 self-stretch rounded-bl-[6px] border-b border-l border-[#e7e0d5]" />}
                    <IconTile metro={row.kind === "metro"} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] leading-tight text-ink">
                        <Highlight text={row.name || row.city} query={query} />
                      </span>
                      <span className="mt-0.5 block whitespace-nowrap text-[11.5px] text-ink-muted">{secondary}</span>
                    </span>
                    <Chip code={row.code} />
                  </button>
                </li>
              );
            })}
        </ul>,
          document.body
        )}
    </label>
  );
}
