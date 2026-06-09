// utils/airportSearch.js — Live airport autocomplete with offline fallback.
// Proxies the keyless TravelPayouts autocomplete API (search-as-you-type) and
// normalizes results. If the API is slow/unreachable or the query is empty, a
// small bundled list of major airports is filtered locally so the UI still
// works offline — mirroring the mock-fallback pattern used elsewhere.
const axios = require("axios");

const AUTOCOMPLETE_URL = "https://autocomplete.travelpayouts.com/places2";

// Minimal offline fallback (used on API error or to seed the dropdown).
const FALLBACK_AIRPORTS = [
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States", countryCode: "US" },
  { code: "LGA", name: "LaGuardia Airport", city: "New York", country: "United States", countryCode: "US" },
  { code: "EWR", name: "Newark Liberty International", city: "Newark", country: "United States", countryCode: "US" },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "United States", countryCode: "US" },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "United States", countryCode: "US" },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "United States", countryCode: "US" },
  { code: "MIA", name: "Miami International", city: "Miami", country: "United States", countryCode: "US" },
  { code: "BOS", name: "Logan International", city: "Boston", country: "United States", countryCode: "US" },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "United States", countryCode: "US" },
  { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "France", countryCode: "FR" },
  { code: "ORY", name: "Paris Orly Airport", city: "Paris", country: "France", countryCode: "FR" },
  { code: "LHR", name: "Heathrow Airport", city: "London", country: "United Kingdom", countryCode: "GB" },
  { code: "LGW", name: "Gatwick Airport", city: "London", country: "United Kingdom", countryCode: "GB" },
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", countryCode: "NL" },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", countryCode: "DE" },
  { code: "MAD", name: "Adolfo Suarez Madrid-Barajas", city: "Madrid", country: "Spain", countryCode: "ES" },
  { code: "FCO", name: "Leonardo da Vinci-Fiumicino", city: "Rome", country: "Italy", countryCode: "IT" },
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", countryCode: "AE" },
  { code: "HND", name: "Tokyo Haneda", city: "Tokyo", country: "Japan", countryCode: "JP" },
  { code: "NRT", name: "Tokyo Narita", city: "Tokyo", country: "Japan", countryCode: "JP" },
  { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore", countryCode: "SG" },
  { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", countryCode: "AU" },
  { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "Canada", countryCode: "CA" },
];

function filterFallback(q) {
  const term = q.toLowerCase();
  return FALLBACK_AIRPORTS.filter(
    (a) =>
      a.code.toLowerCase().includes(term) ||
      a.city.toLowerCase().includes(term) ||
      a.name.toLowerCase().includes(term)
  ).slice(0, 8);
}

// Returns up to ~8 normalized airport matches for a query string.
async function searchAirports(q) {
  const query = (q || "").trim();
  if (!query) return [];

  try {
    const { data } = await axios.get(AUTOCOMPLETE_URL, {
      params: { locale: "en", "types[]": "airport", term: query },
      timeout: 4000,
    });

    const results = (Array.isArray(data) ? data : [])
      .filter((p) => p.code && p.type === "airport")
      .slice(0, 8)
      .map((p) => ({
        code: p.code,
        name: p.name,
        city: p.city_name || p.name,
        country: p.country_name || "",
        countryCode: p.country_code || "",
      }));

    return results.length ? results : filterFallback(query);
  } catch (_err) {
    // Network/API failure — degrade gracefully to the bundled list.
    return filterFallback(query);
  }
}

module.exports = { searchAirports, FALLBACK_AIRPORTS };
