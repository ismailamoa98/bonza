// utils/airportSearch.js — Live airport autocomplete with offline fallback.
// Proxies the keyless TravelPayouts autocomplete API (search-as-you-type) and
// normalizes results. If the API is slow/unreachable or the query is empty, a
// small bundled list of major airports is filtered locally so the UI still
// works offline — mirroring the mock-fallback pattern used elsewhere.
const axios = require("axios");

const AUTOCOMPLETE_URL = "https://autocomplete.travelpayouts.com/places2";

// Minimal offline fallback (used on API error or to seed the dropdown).
// latitude/longitude are the serving CITY-CENTRE coords (not the airport apron) so a hotel search keyed
// off an airport code returns city hotels — see resolveAirport + duffelService.resolveCoords.
const FALLBACK_AIRPORTS = [
  { code: "JFK", name: "John F. Kennedy International", city: "New York", cityCode: "NYC", country: "United States", countryCode: "US", latitude: 40.7128, longitude: -74.006 },
  { code: "LGA", name: "LaGuardia Airport", city: "New York", cityCode: "NYC", country: "United States", countryCode: "US", latitude: 40.7128, longitude: -74.006 },
  { code: "EWR", name: "Newark Liberty International", city: "Newark", country: "United States", countryCode: "US", latitude: 40.7357, longitude: -74.1724 },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "United States", countryCode: "US", latitude: 34.0522, longitude: -118.2437 },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "United States", countryCode: "US", latitude: 37.7749, longitude: -122.4194 },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "United States", countryCode: "US", latitude: 41.8781, longitude: -87.6298 },
  { code: "MIA", name: "Miami International", city: "Miami", country: "United States", countryCode: "US", latitude: 25.7617, longitude: -80.1918 },
  { code: "BOS", name: "Logan International", city: "Boston", country: "United States", countryCode: "US", latitude: 42.3601, longitude: -71.0589 },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "United States", countryCode: "US", latitude: 47.6062, longitude: -122.3321 },
  { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris", cityCode: "PAR", country: "France", countryCode: "FR", latitude: 48.8566, longitude: 2.3522 },
  { code: "ORY", name: "Paris Orly Airport", city: "Paris", cityCode: "PAR", country: "France", countryCode: "FR", latitude: 48.8566, longitude: 2.3522 },
  { code: "LHR", name: "Heathrow Airport", city: "London", cityCode: "LON", country: "United Kingdom", countryCode: "GB", latitude: 51.5074, longitude: -0.1278 },
  { code: "LGW", name: "Gatwick Airport", city: "London", cityCode: "LON", country: "United Kingdom", countryCode: "GB", latitude: 51.5074, longitude: -0.1278 },
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", countryCode: "NL", latitude: 52.3676, longitude: 4.9041 },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", countryCode: "DE", latitude: 50.1109, longitude: 8.6821 },
  { code: "MAD", name: "Adolfo Suarez Madrid-Barajas", city: "Madrid", country: "Spain", countryCode: "ES", latitude: 40.4168, longitude: -3.7038 },
  { code: "FCO", name: "Leonardo da Vinci-Fiumicino", city: "Rome", country: "Italy", countryCode: "IT", latitude: 41.9028, longitude: 12.4964 },
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", countryCode: "AE", latitude: 25.2048, longitude: 55.2708 },
  { code: "AUH", name: "Zayed International", city: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE", latitude: 24.4539, longitude: 54.3773 },
  { code: "DOH", name: "Hamad International", city: "Doha", country: "Qatar", countryCode: "QA", latitude: 25.2731, longitude: 51.6081 },
  { code: "HND", name: "Tokyo Haneda", city: "Tokyo", cityCode: "TYO", country: "Japan", countryCode: "JP", latitude: 35.6762, longitude: 139.6503 },
  { code: "NRT", name: "Tokyo Narita", city: "Tokyo", cityCode: "TYO", country: "Japan", countryCode: "JP", latitude: 35.6762, longitude: 139.6503 },
  { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore", countryCode: "SG", latitude: 1.3521, longitude: 103.8198 },
  { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", countryCode: "AU", latitude: -33.8688, longitude: 151.2093 },
  { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "Canada", countryCode: "CA", latitude: 43.6532, longitude: -79.3832 },
];

// Metropolitan-area IATA codes ("All {city} airports") → city-centre coords, so a metro selection still
// resolves for the offline hotel search (airlines/Duffel accept these natively). Mirrors utils/metros.js.
const METROS = {
  LON: { city: "London", latitude: 51.5074, longitude: -0.1278 },
  NYC: { city: "New York", latitude: 40.7128, longitude: -74.006 },
  PAR: { city: "Paris", latitude: 48.8566, longitude: 2.3522 },
  TYO: { city: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
  OSA: { city: "Osaka", latitude: 34.6937, longitude: 135.5023 },
  MIL: { city: "Milan", latitude: 45.4642, longitude: 9.19 },
  ROM: { city: "Rome", latitude: 41.9028, longitude: 12.4964 },
  MOW: { city: "Moscow", latitude: 55.7558, longitude: 37.6173 },
  CHI: { city: "Chicago", latitude: 41.8781, longitude: -87.6298 },
  WAS: { city: "Washington", latitude: 38.9072, longitude: -77.0369 },
  SAO: { city: "São Paulo", latitude: -23.5558, longitude: -46.6396 },
  BUE: { city: "Buenos Aires", latitude: -34.6037, longitude: -58.3816 },
  YTO: { city: "Toronto", latitude: 43.6532, longitude: -79.3832 },
  STO: { city: "Stockholm", latitude: 59.3293, longitude: 18.0686 },
  BKK: { city: "Bangkok", latitude: 13.7563, longitude: 100.5018 },
  JKT: { city: "Jakarta", latitude: -6.2088, longitude: 106.8456 },
  SHA: { city: "Shanghai", latitude: 31.2304, longitude: 121.4737 },
  BJS: { city: "Beijing", latitude: 39.9042, longitude: 116.4074 },
  SEL: { city: "Seoul", latitude: 37.5665, longitude: 126.978 },
};

// Synchronous lookup: IATA code → { code, city, latitude, longitude } from the bundled table (or a metro
// area), or null. The table is the source of truth for airport→coordinates resolution used by the hotel search.
function resolveAirport(code) {
  const key = String(code || "").trim().toUpperCase();
  if (key.length !== 3) return null;
  const hit = FALLBACK_AIRPORTS.find((a) => a.code === key);
  if (hit) return { code: hit.code, city: hit.city, latitude: hit.latitude, longitude: hit.longitude };
  const metro = METROS[key];
  return metro ? { code: key, city: metro.city, latitude: metro.latitude, longitude: metro.longitude } : null;
}

// IATA code → { code, city, name } for display (flight segments/airports). Falls back to the raw code
// when the airport isn't in the bundled table, so any code is still renderable.
function airportInfo(code) {
  const key = String(code || "").trim().toUpperCase();
  const hit = FALLBACK_AIRPORTS.find((a) => a.code === key);
  if (hit) return { code: hit.code, city: hit.city, name: hit.name };
  const metro = METROS[key];
  return metro ? { code: key, city: metro.city, name: `All ${metro.city} airports` } : { code: key, city: key, name: key };
}

function filterFallback(q) {
  const term = q.toLowerCase();
  return FALLBACK_AIRPORTS.filter(
    (a) =>
      a.code.toLowerCase().includes(term) ||
      a.city.toLowerCase().includes(term) ||
      a.name.toLowerCase().includes(term)
  )
    .slice(0, 8)
    .map((a) => ({ code: a.code, name: a.name, city: a.city, cityCode: a.cityCode || a.code, country: a.country, countryCode: a.countryCode, state: a.state || null }));
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
        cityCode: p.city_code || p.code, // metro/city code — groups an "All {city} airports" parent row
        country: p.country_name || "",
        countryCode: p.country_code || "",
        state: p.state_code || null, // region shown only when the API supplies one
      }));

    return results.length ? results : filterFallback(query);
  } catch (_err) {
    // Network/API failure — degrade gracefully to the bundled list.
    return filterFallback(query);
  }
}

module.exports = { searchAirports, FALLBACK_AIRPORTS, resolveAirport, airportInfo };
