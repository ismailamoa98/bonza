// components/search/SearchFilters.jsx — left column, tab-aware. Hotels: price (total stay), loyalty,
// star rating, review score, property type, amenities, breakfast. Flights: price, stops, airlines,
// cabin, departure/arrival time. Cars: coming soon. Option lists for airlines/programmes are derived
// from the current results so they only show what's actually available.
import { PROGRAMME_LABELS } from "./programmes";
import { PRICE_MAX, programmeOptions } from "./filterResults";

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
};

const toggle = (arr, value) =>
  arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];

const uniq = (xs) => [...new Set(xs.filter(Boolean))];

export default function SearchFilters({ filters, onChange, activeTab, results, resultCount }) {
  const update = (key, value) => onChange((prev) => ({ ...prev, [key]: value }));
  const updateArray = (key, value) => onChange((prev) => ({ ...prev, [key]: toggle(prev[key] || [], value) }));

  return (
    <div className="p-4">
      <p className="text-[11px] font-bold text-ink-300 tracking-wider mb-3 tabular-nums">
        {resultCount} RESULTS
      </p>

      {activeTab === "hotels" && (
        <HotelFilters filters={filters} update={update} updateArray={updateArray} results={results} />
      )}
      {activeTab === "flights" && (
        <FlightFilters filters={filters} update={update} updateArray={updateArray} results={results} />
      )}
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
      <FilterSection label="TOTAL PRICE">
        <PriceSlider value={filters.maxPrice} onChange={(v) => update("maxPrice", v)} />
      </FilterSection>

      <FilterSection label="LOYALTY">
        <FilterCheck label="Award availability only" checked={filters.loyaltyOnly} onChange={(v) => update("loyaltyOnly", v)} />
        <FilterCheck label="Best points value" checked={filters.bestPoints} onChange={(v) => update("bestPoints", v)} />
      </FilterSection>

      {programmes.length > 0 && (
        <FilterSection label="LOYALTY PROGRAMME">
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

      <FilterSection label="STAR RATING">
        {[5, 4, 3].map((star) => (
          <FilterCheck
            key={star}
            label={`${"★".repeat(star)} ${star} star`}
            checked={filters.stars.includes(star)}
            onChange={() => updateArray("stars", star)}
          />
        ))}
      </FilterSection>

      <FilterSection label="HOTEL REVIEW SCORE">
        {REVIEW_SCORES.map(([label, val]) => (
          <FilterCheck
            key={val}
            label={label}
            checked={filters.minRating >= val}
            onChange={(v) => update("minRating", v ? val : 0)}
          />
        ))}
      </FilterSection>

      <FilterSection label="PROPERTY TYPE">
        {PROPERTY_TYPES.map((t) => (
          <FilterCheck
            key={t}
            label={t}
            checked={filters.propertyType.includes(t)}
            onChange={() => updateArray("propertyType", t)}
          />
        ))}
      </FilterSection>

      <FilterSection label="AMENITIES">
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
  const airlines = uniq((results?.flights || []).map((f) => f.airline));
  const cabins = CABINS.filter((c) => (results?.flights || []).some((f) => f.cabin === c));

  return (
    <>
      <FilterSection label="PRICE">
        <PriceSlider value={filters.fMaxPrice} onChange={(v) => update("fMaxPrice", v)} />
      </FilterSection>

      <FilterSection label="STOPS">
        {STOPS.map(([label, val]) => (
          <FilterCheck
            key={val}
            label={label}
            checked={filters.stops.includes(val)}
            onChange={() => updateArray("stops", val)}
          />
        ))}
      </FilterSection>

      {airlines.length > 0 && (
        <FilterSection label="AIRLINES">
          {airlines.map((a) => (
            <FilterCheck key={a} label={a} checked={filters.airlines.includes(a)} onChange={() => updateArray("airlines", a)} />
          ))}
        </FilterSection>
      )}

      {cabins.length > 0 && (
        <FilterSection label="CABIN">
          {cabins.map((c) => (
            <FilterCheck key={c} label={c} checked={filters.cabins.includes(c)} onChange={() => updateArray("cabins", c)} />
          ))}
        </FilterSection>
      )}

      <FilterSection label="DEPARTURE TIME">
        {TIME_BUCKETS.map(([label, val]) => (
          <FilterCheck
            key={val}
            label={label}
            checked={filters.departureTime.includes(val)}
            onChange={() => updateArray("departureTime", val)}
          />
        ))}
      </FilterSection>

      <FilterSection label="ARRIVAL TIME">
        {TIME_BUCKETS.map(([label, val]) => (
          <FilterCheck
            key={val}
            label={label}
            checked={filters.arrivalTime.includes(val)}
            onChange={() => updateArray("arrivalTime", val)}
          />
        ))}
      </FilterSection>
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

function FilterSection({ label, children }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold text-ink-300 tracking-wider mb-2">{label}</p>
      {children}
    </div>
  );
}

function FilterCheck({ label, checked, onChange }) {
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
