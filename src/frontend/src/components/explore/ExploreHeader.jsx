// components/explore/ExploreHeader.jsx — Phase 18. Title + origin picker + map/grid toggle.
const ORIGINS = [
  { code: "LON", city: "London" },
  { code: "MAN", city: "Manchester" },
  { code: "EDI", city: "Edinburgh" },
  { code: "DUB", city: "Dublin" },
];

function MapIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export default function ExploreHeader({ origin, total, view, showToggle, onView, onOrigin }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[2rem] font-bold tracking-[-0.02em] text-[#141210]">Explore everywhere</h1>
        <p className="mt-1 text-[14px] text-[#7A7269]">
          {total ? `${total} countries` : "Every destination"} — cheapest fares from{" "}
          <span className="inline-flex items-center gap-1.5 align-middle">
            <select
              value={origin}
              onChange={(e) => onOrigin(e.target.value)}
              className="rounded-md border border-[#E5DFD6] bg-white px-2 py-1 text-[13px] font-semibold text-[#141210] focus:outline-none"
              aria-label="Departure city"
            >
              {ORIGINS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.city}
                </option>
              ))}
            </select>
          </span>
          , in cash or points.
        </p>
      </div>

      {showToggle && (
        <div className="flex items-center gap-1 rounded-full border border-[#E5DFD6] bg-white p-1">
          {[
            ["map", "Map", <MapIcon key="m" />],
            ["grid", "Grid", <GridIcon key="g" />],
          ].map(([v, label, icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              aria-pressed={view === v}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                view === v ? "bg-[#141210] text-white" : "text-[#6B635B] hover:text-[#141210]"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
