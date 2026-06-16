// utils/mockHotels.js — Mock hotel inventory for the browse-and-optimize grid.
// getHotels(destination) returns ~50 deterministic hotels for a destination so
// the Step 2 grid is stable across reloads. This is the seam where a real hotel
// API would plug in later; the shape stays the same.
//
// Each hotel carries a cash price (pricePerNight) AND per-program award pricing
// (loyaltyPrograms[*].pointsPerNight) so the optimizer can blend cash vs points.

const HOTEL_NAMES = [
  "Le Marais Luxury",
  "Grand Palace",
  "The Riverside",
  "Old Town Suites",
  "Park Central",
  "Harbor View",
  "The Metropolitan",
  "Maison Belle",
  "Skyline Tower",
  "The Heritage",
];

// Amenity vocabulary — matches the FilterSidebar amenity checkboxes exactly so
// the amenities filter actually hits.
const AMENITIES = ["WiFi", "Pool", "Breakfast", "Parking", "Lounge", "Spa", "Gym"];

// Property types a traveller would expect to filter on.
const PROPERTY_TYPES = ["Hotel", "Resort", "Apartment", "Boutique"];

// Loyalty programs a hotel may participate in (keys are lowercased program ids).
const LOYALTY = [
  { key: "marriott", program: "Marriott Bonvoy", base: 22000 },
  { key: "ihg", program: "IHG One Rewards", base: 36000 },
  { key: "hilton", program: "Hilton Honors", base: 24000 },
];

const { priceMultiplier } = require("./pricing");

const round1 = (n) => Math.round(n * 10) / 10;

// Strip an airport-code prefix ("CDG — Paris" -> "Paris"); fall back to the raw
// value so any string is usable as a city label.
function cityLabel(destination) {
  if (!destination) return "Paris";
  const parts = String(destination).split("—");
  return parts[parts.length - 1].trim() || String(destination).trim();
}

// `date` (check-in) scales the nightly cash rate by seasonal demand.
exports.getHotels = (destination = "Paris", date) => {
  const city = cityLabel(destination);
  const mult = priceMultiplier(date);
  const hotels = [];

  for (let i = 0; i < 50; i++) {
    const stars = 3 + (i % 3); // 3..5
    const rating = round1(7.5 + ((i * 7) % 25) / 10); // 7.5..9.9
    const pricePerNight = Math.round((80 + ((i * 13) % 220)) * mult); // 80..299 * season

    // 1–3 loyalty programs per hotel.
    const loyaltyPrograms = {};
    const programCount = 1 + (i % 3);
    for (let k = 0; k < programCount; k++) {
      const L = LOYALTY[(i + k) % LOYALTY.length];
      loyaltyPrograms[L.key] = {
        pointsPerNight: L.base + (i % 5) * 1500,
        program: L.program,
      };
    }

    // A stable subset of amenities.
    const benefits = AMENITIES.filter((_, idx) => (i + idx) % 2 === 0).slice(0, 4);

    const suffix = i >= HOTEL_NAMES.length ? ` ${Math.floor(i / HOTEL_NAMES.length) + 1}` : "";

    hotels.push({
      id: `hotel_${i + 1}`,
      name: `${HOTEL_NAMES[i % HOTEL_NAMES.length]}${suffix}`,
      city,
      country: "",
      stars,
      rating,
      pricePerNight,
      availableNights: 7,
      loyaltyPrograms,
      acceptedPayments: ["cash", "amex", "chase"],
      benefits,
      // Typical filterable attributes.
      propertyType: PROPERTY_TYPES[i % PROPERTY_TYPES.length],
      freeCancellation: i % 3 !== 0,
      breakfastIncluded: benefits.includes("Breakfast") || i % 3 === 0,
      imageUrl: null,
    });
  }

  return hotels;
};
