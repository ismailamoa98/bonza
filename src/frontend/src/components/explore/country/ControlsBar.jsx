// components/explore/country/ControlsBar.jsx — Phase 19. Styled to match the shared TripForm "bar" (rounded
// white pill, hairline dividers, uppercase field labels, round terra-cotta action button). Its fields recompute
// this page's prices in place. The "When" field offers two modes (matching the app's date pickers): Flexible
// (a month, or any) or Specific (a depart→return range, which derives the month + nights). Controls stage into
// a local draft; the action applies it to the URL (triggering the refetch) and is enabled only while dirty.
// Origin is limited to the four seeded origins and month to the six seeded rolling months so the page never empties.
import { useEffect, useState } from "react";
import { Icon, Popover } from "./parts";

const ORIGINS = [
  { code: "LON", label: "London", full: "London (LON)" },
  { code: "MAN", label: "Manchester", full: "Manchester (MAN)" },
  { code: "EDI", label: "Edinburgh", full: "Edinburgh (EDI)" },
  { code: "DUB", label: "Dublin", full: "Dublin (DUB)" },
];

const DAY = 86400000;
const isoDate = (d) => d.toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
const TODAY = isoDate(new Date());
const nightsBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / DAY));

// The six rolling months the availability data covers: this month + the next five.
function monthOptions() {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
    });
  }
  return out;
}
const MONTHS = monthOptions();
const monthLabel = (v) => MONTHS.find((m) => m.value === v)?.label || "Any month";

function formatRange(depart, ret) {
  if (!depart || !ret) return "Pick dates";
  const d1 = new Date(depart);
  const d2 = new Date(ret);
  const day = (d) => d.getDate();
  const mon = (d) => d.toLocaleDateString("en-GB", { month: "short" });
  const sameMonth = d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  return sameMonth ? `${day(d1)}–${day(d2)} ${mon(d2)}` : `${day(d1)} ${mon(d1)} – ${day(d2)} ${mon(d2)}`;
}

function BarLabel({ children }) {
  return <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{children}</span>;
}

function Field({ label, value, children, align, panelClass = "min-w-[200px]", className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <Popover
        align={align}
        panelClass={panelClass}
        trigger={(open, toggle) => (
          <button type="button" onClick={toggle} className="w-full px-4 py-1.5 text-left">
            <BarLabel>{label}</BarLabel>
            <span className="mt-0.5 flex items-center gap-1.5 text-[14px] font-semibold text-ink">
              <span className="truncate">{value}</span>
              <Icon name="chevDown" size={13} sw={2.4} className={`flex-shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
            </span>
          </button>
        )}
      >
        {(close) => children(close)}
      </Popover>
    </div>
  );
}

function ListItem({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] ${active ? "bg-[#141210] text-white" : "text-[#141210] hover:bg-[#FAF8F5]"}`}>
      {children}
      {active && <Icon name="check" size={14} sw={2.6} />}
    </button>
  );
}

function Stepper({ value, min, max, onChange, unit, disabled }) {
  const btn = "flex h-8 w-8 items-center justify-center rounded-full border border-[#E5DFD6] text-[#141210] disabled:opacity-35";
  return (
    <div className="flex items-center justify-between gap-4 px-1 py-1">
      <button type="button" aria-label="Decrease" disabled={disabled || value <= min} onClick={() => onChange(value - 1)} className={btn}>
        <Icon name="minus" size={14} sw={2.4} />
      </button>
      <span className="min-w-[80px] text-center text-[14px] font-bold text-[#141210] tabular-nums">{value} {unit}{value === 1 ? "" : "s"}</span>
      <button type="button" aria-label="Increase" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className={btn}>
        <Icon name="plus" size={14} sw={2.4} />
      </button>
    </div>
  );
}

// Specific | Flexible segmented toggle (matches the app's date-mode switch).
function ModeToggle({ mode, onMode }) {
  return (
    <div className="mb-3 flex rounded-[10px] bg-[#F1EEEA] p-[3px]">
      {[["specific", "Specific dates"], ["flexible", "Flexible dates"]].map(([v, l]) => (
        <button key={v} type="button" onClick={() => onMode(v)} className={`flex-1 rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${mode === v ? "bg-[#141210] text-white" : "text-[#6a6258] hover:text-[#141210]"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function DateField({ label, min, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</span>
      <input type="date" min={min} value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-[#e3ded6] bg-white px-3 py-1.5 text-[13px] text-ink focus:border-bonza focus:outline-none" />
    </label>
  );
}

const same = (a, b) =>
  a.origin === b.origin && a.adults === b.adults && a.mode === b.mode &&
  a.nights === b.nights && a.month === b.month && a.depart === b.depart && a.ret === b.ret;

export default function ControlsBar({ controls, onApply }) {
  const [draft, setDraft] = useState(controls);
  useEffect(() => setDraft(controls), [controls.origin, controls.adults, controls.mode, controls.month, controls.nights, controls.depart, controls.ret]);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = !same(draft, controls);
  const specific = draft.mode === "specific";

  const setMode = (mode) => {
    if (mode === draft.mode) return;
    if (mode === "specific") {
      // Prefill a sensible range from the current nights so the field is usable immediately.
      const depart = draft.depart || addDays(TODAY, 30);
      const ret = draft.ret || addDays(depart, draft.nights || 5);
      set({ mode, depart, ret, month: depart.slice(0, 7), nights: nightsBetween(depart, ret) });
    } else {
      set({ mode, depart: null, ret: null });
    }
  };

  const setDates = (depart, ret) => {
    let d = depart;
    let r = ret;
    if (d && r && new Date(r) <= new Date(d)) r = addDays(d, 1);
    const patch = { depart: d, ret: r };
    if (d && r) {
      patch.month = d.slice(0, 7);
      patch.nights = nightsBetween(d, r);
    }
    set(patch);
  };

  return (
    <div className="mt-5 flex flex-col gap-1 rounded-3xl bg-white p-2 shadow-[0_18px_50px_rgba(40,30,20,0.14)] sm:flex-row sm:items-center sm:gap-0 sm:rounded-full">
      <Field className="flex-1" label="Flying from" value={ORIGINS.find((o) => o.code === draft.origin)?.label || draft.origin}>
        {(close) => (
          <div className="space-y-0.5">
            {ORIGINS.map((o) => (
              <ListItem key={o.code} active={draft.origin === o.code} onClick={() => (set({ origin: o.code }), close())}>{o.full}</ListItem>
            ))}
          </div>
        )}
      </Field>
      <Divider />
      <Field className="flex-1" label="When" panelClass="w-[268px]" value={specific ? formatRange(draft.depart, draft.ret) : monthLabel(draft.month)}>
        {(close) => (
          <div>
            <ModeToggle mode={draft.mode} onMode={setMode} />
            {specific ? (
              <div className="space-y-2.5">
                <DateField label="Depart" min={TODAY} value={draft.depart} onChange={(v) => setDates(v, draft.ret)} />
                <DateField label="Return" min={draft.depart ? addDays(draft.depart, 1) : TODAY} value={draft.ret} onChange={(v) => setDates(draft.depart, v)} />
                <p className="text-[11.5px] text-[#A69C92]">Award seats show for months in the next 6-month window.</p>
              </div>
            ) : (
              <div>
                <ListItem active={!draft.month} onClick={() => (set({ month: null }), close())}>Any month</ListItem>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  {MONTHS.map((m) => (
                    <button key={m.value} type="button" onClick={() => (set({ month: m.value }), close())} className={`rounded-lg px-2 py-2 text-[12.5px] font-semibold ${draft.month === m.value ? "bg-[#141210] text-white" : "text-[#141210] hover:bg-[#FAF8F5]"}`}>{m.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Field>
      <Divider />
      <Field className="flex-1" label="How long" value={`${draft.nights} night${draft.nights === 1 ? "" : "s"}`}>
        {() =>
          specific ? (
            <p className="px-2 py-2 text-center text-[12.5px] text-[#8A8078]">Set by your dates ({draft.nights} nights)</p>
          ) : (
            <Stepper value={draft.nights} min={1} max={21} unit="night" onChange={(n) => set({ nights: n })} />
          )
        }
      </Field>
      <Divider />
      <Field className="flex-1" label="Travellers" value={`${draft.adults} adult${draft.adults === 1 ? "" : "s"}`} align="right">
        {() => <Stepper value={draft.adults} min={1} max={8} unit="adult" onChange={(n) => set({ adults: n })} />}
      </Field>

      <button
        type="button"
        onClick={() => onApply(draft)}
        disabled={!dirty}
        aria-label="Update prices"
        className="flex h-12 items-center justify-center gap-2 rounded-full bg-bonza px-5 text-[14px] font-semibold text-white transition-opacity hover:bg-bonza-dark disabled:opacity-50 sm:ml-1 sm:h-12 sm:w-12 sm:flex-shrink-0 sm:px-0"
      >
        <Icon name="refresh" size={17} sw={2.1} />
        <span className="sm:hidden">Update prices</span>
      </button>
    </div>
  );
}

function Divider() {
  return <span className="hidden w-px self-stretch bg-[#ece7df] sm:block" />;
}
