// components/AirportDropdown.jsx — Searchable airport input (live API).
// Debounces keystrokes, queries GET /airports?q=, and shows matching airports
// to pick from. Calls onSelect with the chosen airport; the parent stores the
// 3-letter code. Props: { label, placeholder, value, displayLabel, onSelect }.
import { useEffect, useRef, useState } from "react";
import { getAirports, apiErrorMessage } from "../utils/api";

export default function AirportDropdown({ label, placeholder, displayLabel, onSelect }) {
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
    setResults([]);
    setOpen(false);
    setDirty(false);
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
          setDirty(true);
          setOpen(true);
        }}
        onFocus={() => results.length && setOpen(true)}
        className="w-full rounded-lg border border-[#e3ded6] bg-white px-3 py-2.5 text-[13px] text-ink focus:border-bonza focus:outline-none"
      />

      {open && (loading || results.length > 0 || error) && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading && <li className="px-3 py-2 text-sm text-slate-400">Searching…</li>}
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
                    <span className="font-semibold text-slate-800">{a.code}</span>
                    <span className="text-slate-600"> — {a.city}</span>
                  </span>
                  <span className="truncate text-xs text-slate-400">{a.country}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </label>
  );
}
