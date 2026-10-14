// hooks/useSearch.js — reads the /search query string, runs the unified search, and mirrors the
// results into the store. Auto-selects the pre-selected package (or the first hotel) into the panel.
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { parseSearchParams } from "../utils/searchUrl";
import { searchTrip, apiErrorMessage } from "../utils/api";
import { track } from "../lib/analytics";
import { EV } from "../lib/analytics/events";

// Standard search-event properties (no exact dates — just the month).
const searchProps = ({ origin, destination, departureDate, returnDate, travelers, cabin }) => ({
  origin: origin || null,
  destination: destination || null,
  depart_month: departureDate ? departureDate.slice(0, 7) : null,
  pax: travelers,
  cabin: cabin || "economy",
  trip_type: returnDate ? "return" : "oneway",
});

export function useSearch() {
  const [searchParams] = useSearchParams();
  const {
    setSearchResults,
    setSelectedResult,
    setSearchLoading,
    setSearchError,
    searchResults,
    searchMeta,
    selectedResult,
    searchLoading,
    searchError,
  } = useAppStore();

  const { origin, destination, departureDate, returnDate, travelers, style, cabin, packageId } =
    parseSearchParams(searchParams);

  useEffect(() => {
    if (!destination) {
      setSearchResults(null, null);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    track(EV.SEARCH_RUN, searchProps({ origin, destination, departureDate, returnDate, travelers, cabin }));

    searchTrip({
      origin: origin || null,
      destination,
      departureDate,
      returnDate,
      adults: travelers,
      travelStyle: style,
      cabin,
      packageId,
    })
      .then((data) => {
        if (cancelled) return;
        setSearchResults(data, data.searchMeta);
        const hasResults = (data.hotels?.length || 0) + (data.flights?.length || 0) > 0;
        if (!hasResults) track(EV.SEARCH_NO_RESULTS, searchProps({ origin, destination, departureDate, returnDate, travelers, cabin }));
        // Arriving from a package card (deep-link) opens that hotel straight away; a plain trip-form
        // search lands on browsable results and opens the overlay only when the user clicks a card.
        const hotels = data.hotels || [];
        if (packageId && hotels.length) {
          setSelectedResult(hotels.find((h) => h.duffelHotelId === packageId) || hotels[0]);
        } else {
          setSelectedResult(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setSearchError(apiErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, departureDate, returnDate, travelers, style, cabin, packageId]);

  return {
    results: searchResults,
    meta: searchMeta,
    selectedResult,
    loading: searchLoading,
    error: searchError,
    setSelected: setSelectedResult,
    hasQuery: !!destination,
  };
}
