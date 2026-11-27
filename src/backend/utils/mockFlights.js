// utils/mockFlights.js — Mock flight inventory for the browse-and-optimize grid.
// getFlights(from, to) returns ~50 deterministic flights so the Step 2 grid is
// stable across reloads. This is the seam where a real flight API would plug in
// later; the shape stays the same.
//
// Each flight carries a cash price (basePrice) AND award pricing (milesRequired
// per program) so the optimizer can blend cash vs points. Times are emitted in
// UTC; the filter reads UTC hours so departure buckets are timezone-stable.
const { priceMultiplier } = require("./pricing");

// code = IATA (flight numbers + airline logo lookup); hub = the carrier's connecting airport for layovers.
const AIRLINES = [
  { name: "United", program: "united", code: "UA", hub: "ORD" },
  { name: "Qatar Airways", program: "qatar", code: "QR", hub: "DOH" },
  { name: "Etihad Airways", program: "etihad", code: "EY", hub: "AUH" },
  { name: "Emirates", program: "emirates", code: "EK", hub: "DXB" },
  { name: "British Airways", program: "british", code: "BA", hub: "LHR" },
];

// Rotated so a flight reads with a plausible widebody type.
const AIRCRAFT = ["Airbus A350-900", "Boeing 777-300ER", "Boeing 787-9", "Airbus A380-800"];

// Cabin names match the FilterSidebar radio options exactly.
const CABINS = [
  { name: "Economy", base: 800, miles: 30000, benefits: ["meals"] },
  { name: "Premium Economy", base: 1600, miles: 50000, benefits: ["meals", "lounge"] },
  { name: "Business", base: 5000, miles: 80000, benefits: ["lounge", "meals", "upgrade"] },
  { name: "First", base: 9000, miles: 120000, benefits: ["lounge", "meals", "upgrade", "suite"] },
];

// Timestamp at `hour` on the searched date (so mock flights fall on the dates the user actually chose).
// Hour overflow (>24) rolls into the next day, giving realistic overnight arrivals + the "+1" marker.
// Falls back to a fixed base date when no date is supplied.
function isoAt(hour, baseISO) {
  const d = baseISO ? new Date(`${String(baseISO).slice(0, 10)}T00:00:00Z`) : new Date("2026-06-01T00:00:00Z");
  d.setUTCHours(hour);
  return d.toISOString();
}

// `date` (check-in) scales the cash price by seasonal demand; points are fixed.
exports.getFlights = (from = "JFK", to = "CDG", date) => {
  const mult = priceMultiplier(date);
  const flights = [];

  for (let i = 0; i < 50; i++) {
    const airline = AIRLINES[i % AIRLINES.length];
    const cabin = CABINS[Math.floor(i / AIRLINES.length) % CABINS.length];

    const depHour = (5 + i * 3) % 19; // 5..23-ish spread across the day
    const durationH = 6 + (i % 9); // 6..14 hours
    const departureTime = isoAt(depHour, date);
    const arrivalTime = isoAt(depHour + durationH, date);
    const stops = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2;

    const basePrice = Math.round((cabin.base + (i % 5) * 120) * mult);
    const baseMiles = cabin.miles + (i % 5) * 2000;

    const premiumCabin = cabin.name === "Business" || cabin.name === "First";

    flights.push({
      id: `flight_${i + 1}`,
      airline: airline.name,
      airlineCode: airline.code,
      hub: airline.hub,
      aircraft: AIRCRAFT[i % AIRCRAFT.length],
      flightNumber: `${airline.code}${100 + i}`,
      from,
      to,
      departureTime,
      arrivalTime,
      cabin: cabin.name,
      basePrice,
      availableSeats: 4 + (i % 9),
      stops,
      // Typical filterable fare attributes (premium cabins always include both).
      refundable: premiumCabin || i % 3 === 0,
      baggageIncluded: premiumCabin || i % 2 === 0,
      // Award pricing — keyed by program plus a transferable "amex" equivalent.
      milesRequired: {
        [airline.program]: baseMiles,
        amex: baseMiles,
      },
      benefits: cabin.benefits,
    });
  }

  return flights;
};
