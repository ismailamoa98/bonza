// pages/SearchPage.jsx — the search results experience (replaces the old /optimize page).
// Three columns: filters · results · detail panel. Search state lives in the URL; the ChatAdvisor
// moved into a slide-in "Ask Bonza" drawer. Sits under the global Navigation (64px).
import { useState } from "react";
import { useSearch } from "../hooks/useSearch";
import SearchBar from "../components/search/SearchBar";
import SearchFilters from "../components/search/SearchFilters";
import SearchResultsList from "../components/search/SearchResultsList";
import DetailPanel from "../components/search/DetailPanel";
import ChatDrawer from "../components/search/ChatDrawer";
import { SparklesIcon } from "../components/search/icons";
import { filterResults, nightsFromMeta, PRICE_MAX } from "../components/search/filterResults";

const TABS = ["hotels", "flights", "cars"];

const DEFAULT_FILTERS = {
  // Hotels
  maxPrice: PRICE_MAX, // total-stay cap (nightly × nights); at PRICE_MAX = no cap
  minRating: 0, // 0–10 scale
  stars: [],
  loyaltyOnly: false,
  bestPoints: false,
  propertyType: [],
  amenities: [],
  breakfastOnly: false,
  loyaltyProgramme: [],
  // Flights
  fMaxPrice: PRICE_MAX,
  stops: [],
  airlines: [],
  cabins: [],
  departureTime: [],
  arrivalTime: [],
};

export default function SearchPage() {
  const { results, meta, selectedResult, loading, setSelected, hasQuery } = useSearch();
  const [activeTab, setActiveTab] = useState("hotels");
  const [chatOpen, setChatOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  return (
    <div className="flex flex-col bg-cream font-jakarta overflow-hidden" style={{ height: "calc(100dvh - 64px)" }}>
      {/* Inline search bar — keyed on the resolved search so it reflects the live trip. */}
      <div className="flex-shrink-0 bg-white border-b border-ink-900/[0.06] px-4 py-3">
        <SearchBar
          key={`${meta?.origin}|${meta?.destination}|${meta?.departureDate}|${meta?.returnDate}|${meta?.travelers}`}
          meta={meta}
        />
      </div>

      {/* Tab row + Ask Bonza */}
      <div className="flex-shrink-0 bg-white border-b border-ink-900/[0.04] px-4">
        <div className="flex gap-0 items-center">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-[13px] font-semibold capitalize border-b-2 transition-all ${
                activeTab === tab
                  ? "text-ink-900 border-bonza"
                  : "text-ink-300 border-transparent hover:text-ink-600"
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={() => setChatOpen(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 my-1.5 bg-cream text-ink-600 rounded-full text-[12px] font-semibold border border-ink-900/[0.08] hover:border-ink-900/[0.16] transition-colors"
          >
            <span className="text-bonza">
              <SparklesIcon />
            </span>
            Ask Bonza
          </button>
        </div>
      </div>

      {/* Body */}
      {!hasQuery ? (
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <p className="font-semibold text-ink-900 mb-1">Start a search</p>
            <p className="text-sm text-ink-300">Enter where you&apos;re going above to see cash and points deals.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[240px] flex-shrink-0 border-r border-ink-900/[0.06] overflow-y-auto bg-white hidden lg:block">
            <SearchFilters
              filters={filters}
              onChange={setFilters}
              activeTab={activeTab}
              results={results}
              resultCount={filterResults(results, activeTab, filters, nightsFromMeta(meta)).length}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <SearchResultsList
              results={results}
              activeTab={activeTab}
              filters={filters}
              loading={loading}
              selectedResult={selectedResult}
              onSelect={setSelected}
            />
          </div>
        </div>
      )}

      {/* Detail panel takes over the screen as a right-side overlay when a result is selected. */}
      {selectedResult && (
        <DetailPanel
          result={selectedResult}
          meta={meta}
          loyaltyAccounts={results?.loyaltyAccounts || []}
          onClose={() => setSelected(null)}
        />
      )}

      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} searchContext={{ meta, selectedResult }} />
    </div>
  );
}
