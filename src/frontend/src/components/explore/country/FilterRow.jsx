// components/explore/country/FilterRow.jsx — Phase 19. Client-side filter pills + a right-aligned sort. Toggling
// a pill never refetches — the parent re-runs applyFilters over the already-fetched cities.
import { Icon, Popover } from "./parts";

const BUDGETS = [1000, 1500, 2000, 3000];
const SORTS = [
  { value: "cheapest", label: "Cheapest first" },
  { value: "points", label: "Points first" },
  { value: "name", label: "Name (A–Z)" },
];

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
        active ? "border-[#141210] bg-[#141210] text-white" : "border-[#E8E3DC] bg-white text-[#141210] hover:border-[#D8D2C8]"
      }`}
    >
      {children}
    </button>
  );
}

export default function FilterRow({ filters, onChange, sort, onSort, tripTypes }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const toggle = (key) => set({ [key]: !filters[key] });

  return (
    <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Pill active={filters.seatsOpen} onClick={() => toggle("seatsOpen")}>
        <span className={`h-[6px] w-[6px] rounded-full ${filters.seatsOpen ? "bg-[#9FE9BB]" : "bg-[#34B368]"}`} />
        Award seats open
      </Pill>
      <Pill active={filters.hotelsOnPoints} onClick={() => toggle("hotelsOnPoints")}>Hotels on points</Pill>
      <Pill active={filters.directOnly} onClick={() => toggle("directOnly")}>Direct only</Pill>

      <Popover
        trigger={(open, t) => (
          <Pill active={filters.maxBudget != null} onClick={t}>
            {filters.maxBudget != null ? `Under £${filters.maxBudget.toLocaleString()}` : "Budget"}
            <Icon name="chevDown" size={12} sw={2.4} className={open ? "rotate-180" : ""} />
          </Pill>
        )}
      >
        {(close) => (
          <div className="min-w-[150px] space-y-0.5">
            <button type="button" onClick={() => (set({ maxBudget: null }), close())} className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-[#141210] hover:bg-[#FAF8F5]">Any budget</button>
            {BUDGETS.map((b) => (
              <button key={b} type="button" onClick={() => (set({ maxBudget: b }), close())} className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] ${filters.maxBudget === b ? "bg-[#141210] text-white" : "text-[#141210] hover:bg-[#FAF8F5]"}`}>Under £{b.toLocaleString()}</button>
            ))}
          </div>
        )}
      </Popover>

      {tripTypes.length > 0 && (
        <Popover
          trigger={(open, t) => (
            <Pill active={filters.tripType != null} onClick={t}>
              {filters.tripType || "Trip type"}
              <Icon name="chevDown" size={12} sw={2.4} className={open ? "rotate-180" : ""} />
            </Pill>
          )}
        >
          {(close) => (
            <div className="min-w-[150px] space-y-0.5">
              <button type="button" onClick={() => (set({ tripType: null }), close())} className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-[#141210] hover:bg-[#FAF8F5]">Any type</button>
              {tripTypes.map((t) => (
                <button key={t} type="button" onClick={() => (set({ tripType: t }), close())} className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] ${filters.tripType === t ? "bg-[#141210] text-white" : "text-[#141210] hover:bg-[#FAF8F5]"}`}>{t}</button>
              ))}
            </div>
          )}
        </Popover>
      )}

      <div className="ml-auto flex-shrink-0 pl-2">
        <Popover
          align="right"
          trigger={(open, t) => (
            <Pill active={false} onClick={t}>
              <Icon name="sort" size={13} sw={2} />
              {SORTS.find((s) => s.value === sort)?.label || "Sort"}
            </Pill>
          )}
        >
          {(close) => (
            <div className="min-w-[160px] space-y-0.5">
              {SORTS.map((s) => (
                <button key={s.value} type="button" onClick={() => (onSort(s.value), close())} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] ${sort === s.value ? "bg-[#141210] text-white" : "text-[#141210] hover:bg-[#FAF8F5]"}`}>
                  {s.label}
                  {sort === s.value && <Icon name="check" size={14} sw={2.6} />}
                </button>
              ))}
            </div>
          )}
        </Popover>
      </div>
    </div>
  );
}
