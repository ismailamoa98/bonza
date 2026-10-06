// utils/searchUrl.js — build/read the /search query-string. All search state lives in the URL so a
// results page is shareable and reloadable; dates travel as a single `dep_ret` pair.

// Searches open in a NEW tab, leaving the launching tab (home, dashboard, points…) exactly where it was.
// openSearch — for handlers that build the URL synchronously inside the click gesture.
export function openSearch(url) {
  window.open(url, "_blank", "noopener");
}

// reserveTab — for handlers that must `await` before the URL is known. Call it synchronously in the click
// gesture to reserve the tab (browsers only allow a popup opened straight from a gesture), then hand the
// handle to redirectTab once the URL is ready. Returns null if the browser blocked it (fall back to same-tab).
export function reserveTab() {
  return window.open("about:blank", "_blank");
}

// redirectTab — point a reserved tab at the finished URL (absolute, since about:blank has no base). If the
// tab was blocked (null), navigate the current tab instead so the search still happens.
export function redirectTab(tab, url, navigate) {
  if (tab) tab.location.href = new URL(url, window.location.origin).href;
  else navigate?.(url);
}

// Concrete check-in/out dates for a discovery search that has no explicit dates. Anchors ~6 months out and
// (for a display month like "May 2026") mid-month, so the range never lands in the past or spills months.
function rangeFrom(start, nights) {
  const end = new Date(start);
  end.setDate(end.getDate() + nights);
  const fmt = (d) => d.toISOString().split("T")[0];
  return { departureDate: fmt(start), returnDate: fmt(end) };
}

export function defaultTripDates(nights = 5) {
  const start = new Date();
  start.setDate(start.getDate() + 180);
  return rangeFrom(start, nights);
}

export function tripDatesFromMonth(travelMonth, nights = 5) {
  if (!travelMonth) return defaultTripDates(nights);
  const [monthName, year] = String(travelMonth).split(" ");
  const start = new Date(`${monthName} 12, ${year}`);
  if (Number.isNaN(start.getTime())) return defaultTripDates(nights);
  return rangeFrom(start, nights);
}

// Airport IATA → its metropolitan-area code, so "Add nearby airports" widens the origin to all of a city's
// airports (Duffel honours metro codes natively). Mirrors the metro member sets in AirportDropdown.
const AIRPORT_METRO = {
  LHR: "LON", LGW: "LON", LTN: "LON", STN: "LON", LCY: "LON", SEN: "LON",
  JFK: "NYC", EWR: "NYC", LGA: "NYC",
  CDG: "PAR", ORY: "PAR", BVA: "PAR",
  HND: "TYO", NRT: "TYO",
  MXP: "MIL", LIN: "MIL", BGY: "MIL",
  FCO: "ROM", CIA: "ROM",
  GRU: "SAO", CGH: "SAO", VCP: "SAO",
};

// Airport code → the Explore page's origin (its four seeded UK/IE origins); London airports fold into LON.
const EXPLORE_ORIGIN = { LON: "LON", LHR: "LON", LGW: "LON", LTN: "LON", STN: "LON", LCY: "LON", SEN: "LON", MAN: "MAN", EDI: "EDI", DUB: "DUB" };
export function exploreOriginFor(code) {
  return EXPLORE_ORIGIN[String(code || "").toUpperCase()] || "LON";
}

export function buildSearchUrl({
  origin,
  destination,
  departureDate,
  returnDate,
  dates, // optional pre-joined "dep_ret"
  travelers = 2,
  style = "points_max",
  packageId = null,
  cabin,
  nearby = false, // widen origin to its metro area (all nearby airports)
  award = false, // surface award availability on the results page
  oneway = false, // one-way trip (no return date)
  flex = 0, // date flexibility window in days (0 | 3 | 7)
}) {
  const params = new URLSearchParams();
  const from = nearby && origin ? AIRPORT_METRO[origin] || origin : origin;
  if (from) params.set("from", from);
  if (destination) params.set("to", destination);
  const range = dates || [departureDate, oneway ? null : returnDate].filter(Boolean).join("_");
  if (range) params.set("dates", range);
  params.set("travelers", String(travelers));
  if (style) params.set("style", style);
  if (cabin && cabin !== "economy") params.set("cabin", cabin);
  if (packageId) params.set("packageId", packageId);
  if (nearby) params.set("nearby", "1");
  if (award) params.set("award", "1");
  if (oneway) params.set("oneway", "1");
  if (flex) params.set("flex", String(flex));
  return `/search?${params.toString()}`;
}

// Read the search params off a URLSearchParams into the shape the search hook + API expect.
export function parseSearchParams(searchParams) {
  const dates = searchParams.get("dates") || "";
  const [departureDate = "", returnDate = ""] = dates.split("_");
  return {
    origin: searchParams.get("from") || "",
    destination: searchParams.get("dest") || searchParams.get("to") || "",
    departureDate,
    returnDate,
    travelers: parseInt(searchParams.get("travelers") || "2", 10),
    style: searchParams.get("style") || "points_max",
    cabin: searchParams.get("cabin") || "economy",
    packageId: searchParams.get("packageId") || null,
  };
}
