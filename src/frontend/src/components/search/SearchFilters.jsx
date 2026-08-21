// components/search/SearchFilters.jsx — left column, tab-aware. Hotels: price (total stay), loyalty,
// star rating, review score, property type, amenities, breakfast. Flights: price, stops, airlines,
// cabin, departure/arrival time. Cars: coming soon. Option lists for airlines/programmes are derived
// from the current results so they only show what's actually available.
import { createContext, useContext, useState } from "react";
import { PROGRAMME_LABELS } from "./programmes";
import {
  PRICE_MAX,
  DURATION_MAX,
  LAYOVER_MAX,
  programmeOptions,
  connectionOptions,
  allianceOptions,
  aircraftOptions,
} from "./filterResults";

// Query context so the search bar can hide non-matching sections/rows without prop-drilling.
const FilterCtx = createContext({ query: "", showAll: true });

const PROPERTY_TYPES = ["Hotel", "Resort", "Apartment", "Boutique"];
const AMENITIES = ["WiFi", "Pool", "Breakfast", "Parking", "Lounge", "Spa", "Gym"];
const CABINS = ["Economy", "Premium Economy", "Business", "First"];
const STOPS = [
  ["Nonstop", 0],
  ["1 stop", 1],
  ["2+ stops", 2],
];
const TIME_BUCKETS = [
  ["Early (5–9)", "early"],
  ["Morning (9–12)", "morning"],
  ["Afternoon (12–17)", "afternoon"],
  ["Evening (17+)", "evening"],
];
const REVIEW_SCORES = [
  ["9.0+ Exceptional", 9.0],
  ["8.0+ Great", 8.0],
  ["7.0+ Good", 7.0],
];

const DEFAULT_FILTERS = {
  maxPrice: PRICE_MAX,
  minRating: 0,
  stars: [],
  loyaltyOnly: false,
  bestPoints: false,
  propertyType: [],
  amenities: [],
  breakfastOnly: false,
  loyaltyProgramme: [],
  fMaxPrice: PRICE_MAX,
  stops: [],
  airlines: [],
  cabins: [],
  departureTime: [],
  arrivalTime: [],
  fMaxDuration: DURATION_MAX,
  maxLayover: LAYOVER_MAX,
  refundableOnly: false,
  bagIncluded: false,
  connectVia: [],
  alliances: [],
  aircraft: [],
  returnDepartureTime: [],
  returnArrivalTime: [],
};

const toggle = (arr, value) =>
  arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];

const uniq = (xs) => [...new Set(xs.filter(Boolean))];

export default function SearchFilters({ filters, onChange, activeTab, results, resultCount }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const update = (key, value) => onChange((prev) => ({ ...prev, [key]: value }));
  const updateArray = (key, value) => onChange((prev) => ({ ...prev, [key]: toggle(prev[key] || [], value) }));

  return (
    <div className="p-4">
      <p className="text-[11px] font-bold text-ink-300 tracking-wider mb-3 tabular-nums">
        {resultCount} RESULTS
      </p>

      {activeTab !== "cars" && (
        <div className="relative mb-4">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search filters…"
            className="w-full text-[12px] rounded-lg border border-ink-900/[0.12] bg-cream pl-8 pr-7 py-2 focus:outline-none focus:border-bonza"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear filter search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      <FilterCtx.Provider value={{ query, showAll: true }}>
        {activeTab === "hotels" && (
          <HotelFilters filters={filters} update={update} updateArray={updateArray} results={results} />
        )}
        {activeTab === "flights" && (
          <FlightFilters filters={filters} update={update} updateArray={updateArray} results={results} />
        )}
      </FilterCtx.Provider>
      {activeTab === "cars" && (
        <p className="text-[12px] text-ink-300">Car search is coming soon — filters will appear here.</p>
      )}

      {activeTab !== "cars" && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="w-full mt-2 py-2 text-[11px] font-semibold text-ink-300 hover:text-bonza transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

function HotelFilters({ filters, update, updateArray, results }) {
  const programmes = programmeOptions(results?.hotels);

  return (
    <>
      <FilterSection label="TOTAL PRICE" terms={["price", "budget", "cost"]}>
        <PriceSlider value={filters.maxPrice} onChange={(v) => update("maxPrice", v)} />
      </FilterSection>

      <FilterSection label="LOYALTY" terms={["award availability", "best points value", "points"]}>
        <FilterCheck label="Award availability only" checked={filters.loyaltyOnly} onChange={(v) => update("loyaltyOnly", v)} />
        <FilterCheck label="Best points value" checked={filters.bestPoints} onChange={(v) => update("bestPoints", v)} />
      </FilterSection>

      {programmes.length > 0 && (
        <FilterSection label="LOYALTY PROGRAMME" terms={programmes.map((p) => PROGRAMME_LABELS[p] || p)}>
          {programmes.map((p) => (
            <FilterCheck
              key={p}
              label={PROGRAMME_LABELS[p] || p}
              checked={filters.loyaltyProgramme.includes(p)}
              onChange={() => updateArray("loyaltyProgramme", p)}
            />
          ))}
        </FilterSection>
      )}

      <FilterSection label="STAR RATING" terms={["5 star", "4 star", "3 star"]}>
        {[5, 4, 3].map((star) => (
          <FilterCheck
            key={star}
            label={`${"★".repeat(star)} ${star} star`}
            checked={filters.stars.includes(star)}
            onChange={() => updateArray("stars", star)}
          />
        ))}
      </FilterSection>

      <FilterSection label="HOTEL REVIEW SCORE" terms={["review", "score", "rating", ...REVIEW_SCORES.map((r) => r[0])]}>
        {REVIEW_SCORES.map(([label, val]) => (
          <FilterCheck
            key={val}
            label={label}
            checked={filters.minRating >= val}
            onChange={(v) => update("minRating", v ? val : 0)}
          />
        ))}
      </FilterSection>

      <FilterSection label="PROPERTY TYPE" terms={PROPERTY_TYPES}>
        {PROPERTY_TYPES.map((t) => (
          <FilterCheck
            key={t}
            label={t}
            checked={filters.propertyType.includes(t)}
            onChange={() => updateArray("propertyType", t)}
          />
        ))}
      </FilterSection>

      <FilterSection label="AMENITIES" terms={[...AMENITIES, "Breakfast included"]}>
        {AMENITIES.map((a) => (
          <FilterCheck
            key={a}
            label={a}
            checked={filters.amenities.includes(a)}
            onChange={() => updateArray("amenities", a)}
          />
        ))}
        <FilterCheck label="Breakfast included" checked={filters.breakfastOnly} onChange={(v) => update("breakfastOnly", v)} />
      </FilterSection>
    </>
  );
}

function FlightFilters({ filters, update, updateArray, results }) {
  const flights = results?.flights || [];
  const airlines = uniq(flights.map((f) => f.airline));
  const cabins = CABINS.filter((c) => flights.some((f) => f.cabin === c));
  const connections = connectionOptions(flights);
  const alliances = allianceOptions(flights);
  const aircraft = aircraftOptions(flights);
  const roundTrip = (flights[0]?.slices?.length || 0) > 1;

  const TimeSection = (label, key) => (
    <FilterSection label={label} terms={["time", ...TIME_BUCKETS.map((t) => t[0])]}>
      {TIME_BUCKETS.map(([lbl, val]) => (
        <FilterCheck
          key={val}
          label={lbl}
          checked={filters[key].includes(val)}
          onChange={() => updateArray(key, val)}
        />
      ))}
    </FilterSection>
  );

  return (
    <>
      <FilterSection label="PRICE" terms={["price", "budget", "cost"]}>
        <PriceSlider value={filters.fMaxPrice} onChange={(v) => update("fMaxPrice", v)} />
      </FilterSection>

      <FilterSection label="MAX JOURNEY TIME" terms={["duration", "journey", "flight time", "total time"]}>
        <HoursSlider value={filters.fMaxDuration} max={DURATION_MAX} onChange={(v) => update("fMaxDuration", v)} />
      </FilterSection>

      <FilterSection label="STOPS" terms={["nonstop", "direct", "stop", "layover", ...STOPS.map((s) => s[0])]}>
        {STOPS.map(([label, val]) => (
          <FilterCheck
            key={val}
            label={label}
            checked={filters.stops.includes(val)}
            onChange={() => updateArray("stops", val)}
          />
        ))}
      </FilterSection>

      <FilterSection label="FARE" terms={["refundable", "checked bag", "baggage", "fare"]}>
        <FilterCheck label="Refundable only" checked={filters.refundableOnly} onChange={(v) => update("refundableOnly", v)} />
        <FilterCheck label="Checked bag included" checked={filters.bagIncluded} onChange={(v) => update("bagIncluded", v)} />
      </FilterSection>

      {airlines.length > 0 && (
        <FilterSection label="AIRLINES" terms={airlines}>
          {airlines.map((a) => (
            <FilterCheck key={a} label={a} checked={filters.airlines.includes(a)} onChange={() => updateArray("airlines", a)} />
          ))}
        </FilterSection>
      )}

      {alliances.length > 0 && (
        <FilterSection label="ALLIANCE" terms={["alliance", ...alliances]}>
          {alliances.map((a) => (
            <FilterCheck key={a} label={a} checked={filters.alliances.includes(a)} onChange={() => updateArray("alliances", a)} />
          ))}
        </FilterSection>
      )}

      {cabins.length > 0 && (
        <FilterSection label="CABIN" terms={["cabin", "class", ...cabins]}>
          {cabins.map((c) => (
            <FilterCheck key={c} label={c} checked={filters.cabins.includes(c)} onChange={() => updateArray("cabins", c)} />
          ))}
        </FilterSection>
      )}

      {aircraft.length > 0 && (
        <FilterSection label="AIRCRAFT" terms={["aircraft", "plane", ...aircraft]}>
          {aircraft.map((a) => (
            <FilterCheck key={a} label={a} checked={filters.aircraft.includes(a)} onChange={() => updateArray("aircraft", a)} />
          ))}
        </FilterSection>
      )}

      {TimeSection(roundTrip ? "OUTBOUND DEPARTURE" : "DEPARTURE TIME", "departureTime")}
      {TimeSection(roundTrip ? "OUTBOUND ARRIVAL" : "ARRIVAL TIME", "arrivalTime")}
      {roundTrip && TimeSection("RETURN DEPARTURE", "returnDepartureTime")}
      {roundTrip && TimeSection("RETURN ARRIVAL", "returnArrivalTime")}

      <FilterSection label="MAX LAYOVER" terms={["layover", "stopover", "connection time"]}>
        <HoursSlider value={filters.maxLayover} max={LAYOVER_MAX} onChange={(v) => update("maxLayover", v)} />
      </FilterSection>

      {connections.length > 0 && (
        <FilterSection label="CONNECT VIA" terms={["connection", "via", "layover airport", ...connections.map((c) => `${c.city} ${c.code}`)]}>
          {connections.map((c) => (
            <FilterCheck
              key={c.code}
              label={`${c.city} (${c.code})`}
              checked={filters.connectVia.includes(c.code)}
              onChange={() => updateArray("connectVia", c.code)}
            />
          ))}
        </FilterSection>
      )}
    </>
  );
}

function PriceSlider({ value, onChange }) {
  return (
    <>
      <input
        type="range"
        min={0}
        max={PRICE_MAX}
        step={50}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-bonza"
      />
      <div className="flex justify-between text-[11px] text-ink-300 mt-1">
        <span>£0</span>
        <span className="font-semibold text-ink-900 tabular-nums">
          £{value.toLocaleString()}
          {value >= PRICE_MAX ? "+" : ""}
        </span>
      </div>
    </>
  );
}

function HoursSlider({ value, max, onChange }) {
  return (
    <>
      <input
        type="range"
        min={1}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-bonza"
      />
      <div className="flex justify-between text-[11px] text-ink-300 mt-1">
        <span>1h</span>
        <span className="font-semibold text-ink-900 tabular-nums">
          {value >= max ? "Any" : `${value}h`}
        </span>
      </div>
    </>
  );
}

// `terms` = extra searchable words (child option labels + synonyms) so typing an option name reveals its
// section. When the section label itself matches, showAll lets every child render; otherwise children
// self-filter to the query.
function FilterSection({ label, terms = [], children }) {
  const { query } = useContext(FilterCtx);
  const labelMatch = !!query && label.toLowerCase().includes(query);
  const termMatch = !!query && terms.some((t) => String(t).toLowerCase().includes(query));
  if (query && !labelMatch && !termMatch) return null;

  return (
    <FilterCtx.Provider value={{ query, showAll: !query || labelMatch }}>
      <div className="mb-5">
        <p className="text-[10px] font-bold text-ink-300 tracking-wider mb-2">{label}</p>
        {children}
      </div>
    </FilterCtx.Provider>
  );
}

function FilterCheck({ label, checked, onChange }) {
  const { query, showAll } = useContext(FilterCtx);
  if (query && !showAll && !String(label).toLowerCase().includes(query)) return null;
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 accent-bonza"
      />
      <span className="text-[12px] text-ink-600">{label}</span>
    </label>
  );
}
