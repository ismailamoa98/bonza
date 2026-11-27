// services/roomsAeroService.js — hotel award availability/pricing (Rooms.aero). Offline-gated: without a
// real key it returns [] so the monthly hero-board refresh is a safe no-op and the seeded figures stay put
// ("stale beats empty"). Wire the live integration here when ROOMS_AERO_API_KEY is configured.
const env = require("../config/env");

const hasRoomsAero = Boolean(process.env.ROOMS_AERO_API_KEY);

// searchHotelAwards({ destination, programme, checkIn, checkOut, adults })
//   -> [{ name, propertyCode, pointsTotal, starRating, awardAvailable }]
async function searchHotelAwards() {
  if (!hasRoomsAero || !env.hasSeatsAero) {
    return []; // offline / not configured — leave the seeded board untouched
  }
  // TODO(prod): call the Rooms.aero API, map results to the shape above.
  return [];
}

module.exports = { searchHotelAwards, hasRoomsAero };
