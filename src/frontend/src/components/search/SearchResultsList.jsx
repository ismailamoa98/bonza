// components/search/SearchResultsList.jsx — centre column: sort bar, result cards, empty state.
import { useState } from "react";
import SearchResultCard from "./SearchResultCard";
import SearchSkeleton from "./SearchSkeleton";
import { SearchOffIcon } from "./icons";
import { filterResults, nightsFromMeta } from "./filterResults";

const SORTS = ["Best value", "Price: low to high", "Points value", "Star rating"];

export default function SearchResultsList({
  results,
  activeTab,
  filters,
  loading,
  selectedResult,
  onSelect,
}) {
  const [sort, setSort] = useState("Best value");

  if (loading) return <SearchSkeleton />;

  const nights = nightsFromMeta(results?.searchMeta);
  const items = filterResults(results, activeTab, filters, nights);

  if (!items.length) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 text-center">
        <div>
          <div className="w-12 h-12 bg-cream rounded-xl flex items-center justify-center mx-auto mb-3 text-ink-300">
            <SearchOffIcon />
          </div>
          <p className="font-semibold text-ink-900 mb-1">No results found</p>
          <p className="text-sm text-ink-300">
            {activeTab === "cars" ? "Car search is coming soon" : "Try adjusting your filters or dates"}
          </p>
        </div>
      </div>
    );
  }

  const sorted = sortResults(items, sort, activeTab);
  const dateLabel = dateRangeLabel(results?.searchMeta);

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] text-ink-300 tabular-nums">
          {items.length} results · sorted by {sort.toLowerCase()}
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="text-[11px] text-ink-600 bg-white border border-ink-900/[0.08] rounded-lg px-2 py-1"
        >
          {SORTS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>

      <div
        className={
          activeTab === "hotels"
            ? "grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
            : "flex flex-col gap-2.5"
        }
      >
        {sorted.map((item, i) => (
          <SearchResultCard
            key={item.duffelHotelId || item.id || item.duffelOfferId || i}
            result={item}
            activeTab={activeTab}
            nights={nights}
            dateLabel={dateLabel}
            isSelected={
              (item.duffelHotelId && selectedResult?.duffelHotelId === item.duffelHotelId) ||
              (item.id && selectedResult?.id === item.id)
            }
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </>
  );
}

// "12 Sep – 15 Sep" style label for the card's date row.
function dateRangeLabel(meta) {
  if (!meta?.departureDate || !meta?.returnDate) return "";
  const fmt = (s) =>
    new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(meta.departureDate)} – ${fmt(meta.returnDate)}`;
}

function sortResults(items, sort, activeTab) {
  const copy = [...items];
  if (activeTab === "flights") {
    return copy.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
  }
  switch (sort) {
    case "Price: low to high":
      return copy.sort((a, b) => (a.cashOption?.priceGbp || 0) - (b.cashOption?.priceGbp || 0));
    case "Points value":
      return copy.sort(
        (a, b) => (b.pointsOption?.centsPerPoint || 0) - (a.pointsOption?.centsPerPoint || 0)
      );
    case "Star rating":
      return copy.sort((a, b) => (b.starRating || 0) - (a.starRating || 0));
    default: // Best value — points value first, then lower cash price
      return copy.sort((a, b) => {
        const av = a.pointsOption?.centsPerPoint || 0;
        const bv = b.pointsOption?.centsPerPoint || 0;
        if (bv !== av) return bv - av;
        return (a.cashOption?.priceGbp || 0) - (b.cashOption?.priceGbp || 0);
      });
  }
}
