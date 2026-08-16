// components/search/SearchSkeleton.jsx — loading placeholders matching the 2-col vertical card grid.
export default function SearchSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <div className="h-3 w-32 bg-ink-900/[0.06] rounded animate-pulse" />
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex flex-col bg-white rounded-2xl border border-ink-900/[0.05] overflow-hidden">
            <div className="h-36 bg-ink-900/[0.06] animate-pulse" />
            <div className="p-3.5 flex flex-col gap-2">
              <div className="h-3.5 w-3/4 bg-ink-900/[0.06] rounded animate-pulse" />
              <div className="h-2.5 w-1/2 bg-ink-900/[0.04] rounded animate-pulse" />
              <div className="h-5 w-1/3 bg-ink-900/[0.06] rounded animate-pulse mt-2" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
