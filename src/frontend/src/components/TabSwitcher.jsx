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
    <div className="inline-flex gap-1 rounded-xl bg-white p-1 font-jakarta ring-1 ring-black/5">
      {TABS.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setActiveTab(key)}
          className={[
            "rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors",
            activeTab === key
              ? "bg-bonza text-white"
              : "text-ink-soft hover:text-ink",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
