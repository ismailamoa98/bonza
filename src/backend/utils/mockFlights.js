// utils/mockFlights.js — Mock flight inventory for the browse-and-optimize grid.
// getFlights(from, to) returns ~50 deterministic flights so the Step 2 grid is
// stable across reloads. This is the seam where a real flight API would plug in
// later; the shape stays the same.
//
// Each flight carries a cash price (basePrice) AND award pricing (milesRequired
// per program) so the optimizer can blend cash vs points. Times are emitted in
// UTC; the filter reads UTC hours so departure buckets are timezone-stable.
const { priceMultiplier } = require("./pricing");

const AIRLINES = [
  { name: "United", program: "united" },
  { name: "Qatar", program: "qatar" },
  { name: "Etihad", program: "etihad" },
  { name: "Emirates", program: "emirates" },
  { name: "British Airways", program: "british" },
];

// Cabin names match the FilterSidebar radio options exactly.
const CABINS = [
  { name: "Economy", base: 800, miles: 30000, benefits: ["meals"] },
  { name: "Premium Economy", base: 1600, miles: 50000, benefits: ["meals", "lounge"] },
  { name: "Business", base: 5000, miles: 80000, benefits: ["lounge", "meals", "upgrade"] },
  { name: "First", base: 9000, miles: 120000, benefits: ["lounge", "meals", "upgrade", "suite"] },
];

// A fixed base date keeps departure/arrival deterministic for the mock.
function isoAt(hour) {
  const d = new Date("2026-06-01T00:00:00Z");
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
    const departureTime = isoAt(depHour);
    const arrivalTime = isoAt(depHour + durationH);
    const stops = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2;

    const basePrice = Math.round((cabin.base + (i % 5) * 120) * mult);
    const baseMiles = cabin.miles + (i % 5) * 2000;

    flights.push({
      id: `flight_${i + 1}`,
      airline: airline.name,
      flightNumber: `${airline.name.slice(0, 2).toUpperCase()}${100 + i}`,
      from,
      to,
      departureTime,
      arrivalTime,
      cabin: cabin.name,
      basePrice,
      availableSeats: 4 + (i % 9),
      stops,
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
