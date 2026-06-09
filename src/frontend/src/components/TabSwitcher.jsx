// components/TabSwitcher.jsx — Hotels / Flights tab toggle for the browse grid.
// Switches which grid + which filter set is shown. Selection of a flight/hotel
// persists across switches (held in the store), so the panel keeps its picks.
import { useAppStore } from "../store/appStore";

const TABS = [
  ["hotels", "Hotels"],
  ["flights", "Flights"],
  ["cars", "Cars"],
];

export default function TabSwitcher() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
      {TABS.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setActiveTab(key)}
          className={[
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            activeTab === key
              ? "bg-white text-bonza shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
