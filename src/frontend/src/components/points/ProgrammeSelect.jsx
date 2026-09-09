// components/points/ProgrammeSelect.jsx — a refined, searchable dropdown for picking a loyalty programme.
// Custom (not a native <select>) so it can show brand-colour dots, category groups, a search box, and a
// selected tick. Closes on outside-click / Escape.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, SearchIcon, CheckIcon } from "./icons";

const GROUPS = [
  ["card", "Credit cards"],
  ["hotel", "Hotels"],
  ["airline", "Airlines"],
];

export default function ProgrammeSelect({ value, onChange, items }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  const selected = items.find((i) => i.programme === value) || null;

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

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (i) => !q || i.displayName.toLowerCase().includes(q);
    return GROUPS.map(([key, label]) => [label, items.filter((i) => i.category === key && match(i))]).filter(
      ([, arr]) => arr.length
    );
  }, [items, query]);

  const pick = (programme) => {
    onChange(programme);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full rounded-xl border bg-white px-3.5 py-3 flex items-center justify-between gap-2 text-[14px] transition-colors ${
          open ? "border-bonza" : "border-ink-900/[0.14] hover:border-ink-900/[0.28]"
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {selected && (
            <span className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ background: selected.brandColor }} />
          )}
          <span className="truncate text-ink-900">{selected ? selected.displayName : "Select a programme"}</span>
        </span>
        <ChevronDownIcon
          width="16"
          height="16"
          className={`text-ink-300 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-ink-900/[0.08] bg-white shadow-[0_20px_50px_rgba(120,80,50,0.18)] overflow-hidden">
          <div className="p-2 border-b border-ink-900/[0.06]">
            <div className="flex items-center gap-2 rounded-lg bg-cream px-2.5 py-2">
              <SearchIcon width="15" height="15" className="text-ink-300 flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search programmes…"
                className="w-full bg-transparent text-[13px] text-ink-900 placeholder:text-ink-300 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto py-1.5">
            {grouped.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-[12.5px] text-ink-300">No programmes match “{query}”.</p>
            ) : (
              grouped.map(([label, arr]) => (
                <div key={label} className="px-1.5 pb-1">
                  <p className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-300">{label}</p>
                  {arr.map((it) => {
                    const isSel = it.programme === value;
                    return (
                      <button
                        key={it.programme}
                        type="button"
                        onClick={() => pick(it.programme)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                          isSel ? "bg-bonza/[0.08]" : "hover:bg-cream"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ background: it.brandColor }} />
                        <span className={`flex-1 text-[13px] truncate ${isSel ? "font-semibold text-ink-900" : "text-ink-700"}`}>
                          {it.displayName}
                        </span>
                        {isSel && <CheckIcon width="15" height="15" className="text-bonza flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
