// components/search/SearchBar.jsx — compact, pre-filled search bar at the top of the results page.
// Lets the user edit the trip and re-run the search without leaving /search.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AirportDropdown from "../AirportDropdown";
import { buildSearchUrl } from "../../utils/searchUrl";

export default function SearchBar({ meta }) {
  const navigate = useNavigate();
  const [from, setFrom] = useState(meta?.origin || "");
  const [to, setTo] = useState(meta?.destination || "");
  const [outbound, setOutbound] = useState(meta?.departureDate || "");
  const [returnDate, setReturnDate] = useState(meta?.returnDate || "");
  const [travelers, setTravelers] = useState(meta?.travelers || 2);

  function handleSearch() {
    if (!to) return;
    navigate(
      buildSearchUrl({
        origin: from,
        destination: to,
        departureDate: outbound,
        returnDate,
        travelers,
        style: meta?.travelStyle || "points_max",
      })
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2 bg-white rounded-full border border-ink-900/[0.07] p-1.5 pl-3">
      <div className="min-w-[120px] flex-1">
        <AirportDropdown bare placeholder="From" displayLabel={from} onSelect={(a) => setFrom(a.code)} />
      </div>
      <div className="w-px h-5 bg-ink-900/[0.08]" />
      <div className="min-w-[120px] flex-1">
        <AirportDropdown bare placeholder="To" displayLabel={to} onSelect={(a) => setTo(a.code)} />
      </div>
      <div className="w-px h-5 bg-ink-900/[0.08]" />
      <input
        type="date"
        value={outbound}
        onChange={(e) => setOutbound(e.target.value)}
        className="text-[13px] font-medium text-ink-900 bg-transparent border-none outline-none px-2 w-32 tabular-nums"
      />
      <div className="w-px h-5 bg-ink-900/[0.08]" />
      <input
        type="date"
        value={returnDate}
        onChange={(e) => setReturnDate(e.target.value)}
        className="text-[13px] font-medium text-ink-900 bg-transparent border-none outline-none px-2 w-32 tabular-nums"
      />
      <div className="w-px h-5 bg-ink-900/[0.08]" />
      <select
        value={travelers}
        onChange={(e) => setTravelers(parseInt(e.target.value, 10))}
        className="text-[13px] font-medium text-ink-900 bg-transparent border-none outline-none px-2 w-24"
      >
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <option key={n} value={n}>
            {n} adult{n > 1 ? "s" : ""}
          </option>
        ))}
      </select>
      <button
        onClick={handleSearch}
        aria-label="Search"
        className="w-10 h-10 rounded-full bg-bonza text-white flex items-center justify-center flex-shrink-0 ml-auto"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
    </div>
  );
}
