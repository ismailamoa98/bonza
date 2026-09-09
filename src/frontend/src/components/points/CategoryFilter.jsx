// components/points/CategoryFilter.jsx — category tabs (left) + an "Add programme" button (right) that
// opens the add-programme slide-in panel.
import { PlusIcon } from "./icons";

const TABS = [
  { key: "all", label: "All" },
  { key: "hotel", label: "Hotels" },
  { key: "airline", label: "Airlines" },
  { key: "card", label: "Cards" },
  { key: "car", label: "Cars" },
];

export default function CategoryFilter({ active, onChange, counts, onAdd }) {
  return (
    <div className="flex items-center justify-between mt-[22px] mb-2">
      <div className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`text-[12.5px] px-[11px] py-[5px] rounded-md flex items-center gap-1.5 transition-colors ${
              active === tab.key
                ? "text-ink-900 font-semibold bg-[#E9E4DB]"
                : "text-ink-300 font-medium hover:text-ink-900 hover:bg-[#EFEBE4]"
            }`}
          >
            {tab.label}
            <span className="text-[11px] text-ink-300 font-medium">{counts[tab.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-600 px-3 py-1.5 rounded-lg border border-ink-900/[0.15] hover:border-bonza hover:text-bonza transition-colors"
      >
        <PlusIcon width="14" height="14" />
        Add programme
      </button>
    </div>
  );
}
