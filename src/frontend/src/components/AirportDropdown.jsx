// components/AirportDropdown.jsx — Searchable airport input (live API).
// Debounces keystrokes, queries GET /airports?q=, and shows matching airports
// to pick from. Calls onSelect with the chosen airport; the parent stores the
// 3-letter code. Props: { label, placeholder, value, displayLabel, onSelect, bare }.
//   bare — borderless/transparent input for the horizontal hero search "bar".
//   onQueryChange — reports the raw typed text so the parent can resolve a
//   typed-but-unselected airport (top match) at submit time.
import { useEffect, useRef, useState } from "react";
import { getAirports, apiErrorMessage } from "../utils/api";

export default function AirportDropdown({ label, placeholder, displayLabel, onSelect, onQueryChange, bare = false }) {
  const [query, setQuery] = useState(displayLabel || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false); // user typed since last selection
  const boxRef = useRef(null);

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

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (airport) => {
    onSelect(airport);
    setQuery(`${airport.code} — ${airport.city}`);
    onQueryChange?.(""); // committed — clear any pending typed text
    setResults([]);
    setOpen(false);
    setDirty(false);
  };

  // Enter commits the top match instead of submitting the form with an empty code.
  const onKeyDown = (e) => {
    if (e.key === "Enter" && open && results.length > 0) {
      e.preventDefault();
      choose(results[0]);
    }
  };

  return (
    <label className="relative block" ref={boxRef}>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </span>
      <input
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
        onFocus={() => results.length && setOpen(true)}
        className={
          bare
            ? "w-full bg-transparent text-[14px] font-semibold text-ink placeholder:font-normal placeholder:text-ink-muted focus:outline-none"
            : "w-full rounded-lg border border-[#e3ded6] bg-white px-3 py-2.5 text-[13px] text-ink focus:border-bonza focus:outline-none"
        }
      />

      {open && (loading || results.length > 0 || error) && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[#e0d9cf] bg-white font-jakarta shadow-[0_12px_30px_rgba(40,30,20,0.14)]">
          {loading && <li className="px-3 py-2 text-sm text-ink-muted">Searching…</li>}
          {error && !loading && (
            <li className="px-3 py-2 text-sm text-amber-600">{error}</li>
          )}
          {!loading &&
            results.map((a) => (
              <li key={`${a.code}-${a.name}`}>
                <button
                  type="button"
                  onClick={() => choose(a)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-bonza-50"
                >
                  <span>
                    <span className="font-semibold text-ink">{a.code}</span>
                    <span className="text-ink-soft"> — {a.city}</span>
                  </span>
                  <span className="truncate text-xs text-ink-muted">{a.country}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </label>
  );
}
