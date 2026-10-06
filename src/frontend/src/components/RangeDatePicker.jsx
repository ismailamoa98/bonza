// components/RangeDatePicker.jsx — Phase 20. A custom range date picker replacing the native <input type=date>.
// One popover, two months side by side, drag/click range select. Every cell shows the day's cash fare (cheapest
// days in green) and a green dot where award seats exist (Bonza's differentiator) — fed by the public
// GET /price-calendar. Modes across the top: Return · One way · Whole month. Flexibility across the bottom:
// Exact · ±3 · ±7. Whole month picks a month (availability-driven). Prices show only when From + To are set.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";
import { getPriceCalendar } from "../utils/api";

const iso = (d) => format(d, "yyyy-MM-dd");
const parseIso = (s) => (s ? new Date(`${s}T00:00:00`) : null);
const TODAY = new Date(new Date().toDateString());
const monthKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

// The next 12 months, for Whole-month mode.
function nextMonths() {
  const out = [];
  for (let i = 0; i < 12; i++) {
    const d = addMonths(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), i);
    out.push({ key: monthKeyOf(d), label: d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }), long: d.toLocaleDateString("en-GB", { month: "long" }) });
  }
  return out;
}
const MONTHS = nextMonths();

function triggerLabel(v) {
  if (v.mode === "month") return v.wholeMonth ? `Whole of ${MONTHS.find((m) => m.key === v.wholeMonth)?.long || ""}` : "Pick a month";
  const fmt = (s) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null);
  const suffix = v.flexDays > 0 ? ` · ±${v.flexDays} days` : "";
  if (v.mode === "oneway") return v.depart ? `One way · ${fmt(v.depart)}${suffix}` : "Add date";
  return v.depart && v.ret ? `${fmt(v.depart)} → ${fmt(v.ret)}${suffix}` : v.depart ? `${fmt(v.depart)} → …` : "Add dates";
}

function Seg({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${active ? "bg-[#141210] text-white" : "text-[#6a6258] hover:text-[#141210]"}`}>
      {children}
    </button>
  );
}

export default function RangeDatePicker({ value, onChange, origin, destination, tone = "light", size = "md" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [draft, setDraft] = useState(value);
  const [prices, setPrices] = useState({}); // iso → { cash, cheapest, award }
  const [viewMonth, setViewMonth] = useState(parseIso(value.depart) || TODAY);
  const fetched = useRef(new Set());
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const lg = size === "lg";
  const dark = tone === "dark";

  useEffect(() => setDraft(value), [value]);

  // Position the portalled popover under the trigger; recompute on scroll/resize.
  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(620, window.innerWidth - 16);
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      setPos({ top: r.bottom + 6, left, width });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Fetch the price calendar for the two visible months (when From + To are known). Cached per month.
  useEffect(() => {
    if (!open || draft.mode === "month" || !origin || !destination) return;
    [viewMonth, addMonths(viewMonth, 1)].forEach((d) => {
      const key = monthKeyOf(d);
      if (fetched.current.has(key)) return;
      fetched.current.add(key);
      getPriceCalendar(origin, destination, key)
        .then((res) => {
          setPrices((prev) => {
            const next = { ...prev };
            for (const day of res.days || []) next[day.date] = { cash: day.cash, cheapest: day.cheapest, award: day.award };
            return next;
          });
        })
        .catch(() => {});
    });
  }, [open, viewMonth, origin, destination, draft.mode]);

  const selected = useMemo(() => {
    if (draft.mode === "oneway") return parseIso(draft.depart) || undefined;
    return { from: parseIso(draft.depart) || undefined, to: parseIso(draft.ret) || undefined };
  }, [draft]);

  const commit = (next) => {
    setDraft(next);
    onChange(next);
  };

  const onSelectRange = (range) => {
    setDraft((d) => ({ ...d, depart: range?.from ? iso(range.from) : null, ret: range?.to ? iso(range.to) : null }));
  };
  const onSelectSingle = (day) => setDraft((d) => ({ ...d, depart: day ? iso(day) : null, ret: null }));

  const setMode = (mode) => setDraft((d) => ({ ...d, mode, ...(mode === "oneway" ? { ret: null } : {}) }));

  // Custom day cell — number + cash price (green when cheapest) + a green award dot.
  const DayButton = (props) => {
    const { day, modifiers, className, children, ...rest } = props;
    const info = prices[iso(day.date)];
    return (
      <button {...rest} className={`${className || ""} bonza-daycell`}>
        <span className="bonza-daynum">{day.date.getDate()}</span>
        {info && <span className={`bonza-dayprice ${info.cheapest ? "is-cheap" : ""}`}>£{info.cash}</span>}
        {info?.award && <span className="bonza-dayaward" />}
      </button>
    );
  };

  const applyDisabled = draft.mode === "month" ? !draft.wholeMonth : draft.mode === "oneway" ? !draft.depart : !(draft.depart && draft.ret);

  return (
    <div className="min-w-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`block w-full truncate text-left font-semibold focus:outline-none ${lg ? "text-[16px]" : "text-[14px]"} ${dark ? "text-white" : "text-ink"} ${applyDisabled && draft.mode !== "month" && !draft.depart ? "font-normal " + (dark ? "text-white/45" : "text-ink-muted") : ""}`}
      >
        {triggerLabel(draft)}
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            className="z-[60] overflow-hidden rounded-2xl border border-[#e0d9cf] bg-white shadow-[0_20px_50px_rgba(40,30,20,0.2)]"
          >
            {/* Mode tabs */}
            <div className="flex items-center gap-1 border-b border-[#f0ebe3] px-3 py-2">
              <Seg active={draft.mode === "return"} onClick={() => setMode("return")}>Return</Seg>
              <Seg active={draft.mode === "oneway"} onClick={() => setMode("oneway")}>One way</Seg>
              <Seg active={draft.mode === "month"} onClick={() => setMode("month")}>Whole month</Seg>
            </div>

            {draft.mode === "month" ? (
              <div className="grid grid-cols-3 gap-2 p-4">
                {MONTHS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, wholeMonth: m.key }))}
                    className={`rounded-xl border px-3 py-3 text-[13px] font-semibold ${draft.wholeMonth === m.key ? "border-bonza bg-bonza text-white" : "border-[#ece7df] text-[#141210] hover:border-[#d8d2c8]"}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bonza-rdp px-2 py-2">
                <DayPicker
                  mode={draft.mode === "oneway" ? "single" : "range"}
                  numberOfMonths={2}
                  month={viewMonth}
                  onMonthChange={setViewMonth}
                  selected={selected}
                  onSelect={draft.mode === "oneway" ? onSelectSingle : onSelectRange}
                  disabled={{ before: TODAY }}
                  showOutsideDays={false}
                  components={{ DayButton }}
                />
              </div>
            )}

            {/* Footer: flexibility + apply */}
            <div className="flex items-center justify-between gap-3 border-t border-[#f0ebe3] px-3 py-2.5">
              {draft.mode === "month" ? (
                <span className="text-[11.5px] text-[#A69C92]">Availability drives the trip — we’ll browse the whole month.</span>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#A69C92]">Flexibility</span>
                  {[0, 3, 7].map((n) => (
                    <Seg key={n} active={draft.flexDays === n} onClick={() => setDraft((d) => ({ ...d, flexDays: n }))}>
                      {n === 0 ? "Exact" : `±${n}`}
                    </Seg>
                  ))}
                </div>
              )}
              <button
                type="button"
                disabled={applyDisabled}
                onClick={() => {
                  commit(draft);
                  setOpen(false);
                }}
                className="rounded-lg bg-[#141210] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#332B25] disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
