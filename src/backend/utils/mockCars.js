// utils/mockCars.js — Mock rental-car inventory for the browse-and-optimize grid.
// getCars(location) returns ~30 deterministic cars so the Step 2 grid is stable
// across reloads. This is the seam where a real car API would plug in later; the
// shape stays the same. Cars are cash-only (no award pricing) — they consume
// budget but earn no points savings.

const VENDORS = ["Hertz", "Enterprise", "Alamo", "Avis", "Budget", "Sixt"];

// Car class -> base price per day + seats. Names match the FilterSidebar options.
const CLASSES = [
  { name: "Economy", perDay: 34, seats: 4 },
  { name: "Compact", perDay: 44, seats: 4 },
  { name: "Midsize", perDay: 58, seats: 5 },
  { name: "SUV", perDay: 86, seats: 5 },
  { name: "Luxury", perDay: 140, seats: 4 },
];

const { priceMultiplier } = require("./pricing");

function cityLabel(location) {
  if (!location) return "Paris";
  const parts = String(location).split("—");
  return parts[parts.length - 1].trim() || String(location).trim();
}

// `date` (check-in) scales the daily cash rate by seasonal demand.
exports.getCars = (location = "Paris", date) => {
  const city = cityLabel(location);
  const mult = priceMultiplier(date);
  const cars = [];

  for (let i = 0; i < 30; i++) {
    const vendor = VENDORS[i % VENDORS.length];
    const cls = CLASSES[Math.floor(i / VENDORS.length) % CLASSES.length];
    const pricePerDay = Math.round((cls.perDay + (i % 5) * 6) * mult);

    cars.push({
      id: `car_${i + 1}`,
      vendor,
      carClass: cls.name,
      city,
      pricePerDay,
      seats: cls.seats,
      transmission: i % 4 === 0 ? "Manual" : "Automatic",
      benefits: i % 3 === 0 ? ["Free cancellation"] : [],
    });
  }

  return cars;
};
