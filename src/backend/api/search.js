// api/search.js — Phase 12 unified search: cash + points across hotels and flights in one call.
// Single POST endpoint (auth + rate limit applied at mount in server.js). Offline-safe (Duffel mocks).
const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const env = require("../config/env");
const { searchHotels, searchFlights } = require("../services/duffelService");
const { searchAwardFlights } = require("../services/seatsAeroService");
const { isProActive } = require("../middleware/requirePro");
const { CASHBACK_RATE } = require("../config/constants");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { logger } = require("../utils/logger");

const round2 = (n) => parseFloat((Number(n) || 0).toFixed(2));

// A points redemption becomes "best" (highlighted) once its value clears this benchmark.
const POINTS_BENCHMARK_CPP = 1.3;

// Turn a cached award-availability row into the hotel's points option, valued against its cash rate.
function buildPointsOption(award, hotel, accounts) {
  if (!award || !hotel?.lowestRate) return null;
  const centsPerPoint = round2((hotel.lowestRate / award.pointsCost) * 100);
  return {
    programme: award.programme,
    pointsCost: award.pointsCost,
    centsPerPoint,
    aboveBenchmark: centsPerPoint >= POINTS_BENCHMARK_CPP,
    bookingUrl: award.bookingUrl || null,
    userCanAfford: accounts.some((a) => a.programme === award.programme && a.balance >= award.pointsCost),
  };
}

// POST / — one search that returns cash hotels (+ points), cash flights (+ award), and the user's context.
router.post("/", async (req, res, next) => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults,
      travelStyle,
      cabin,
      packageId, // when coming from a package card — pre-select this result
    } = req.body || {};

    if (!destination || !departureDate || !returnDate) {
      return res
        .status(400)
        .json({ error: { message: "destination, departureDate and returnDate are required" } });
    }

    const travelers = parseInt(adults, 10) || 2;

    recordEvent(req.userId, EVENT_TYPES.AWARD_SEARCH_RUN, {
      origin,
      destination,
      departureDate,
      returnDate,
      adults: travelers,
      travelStyle,
    }).catch(() => {});

    // Each supplier leg is isolated: a single failure degrades that leg to empty rather than 500-ing the
    // whole search (hotels also self-fall-back to mock inside duffelService.searchHotels).
    const [cashHotels, cashFlights, accounts, awards, sub] = await Promise.all([
      searchHotels({ location: destination, checkIn: departureDate, checkOut: returnDate, adults: travelers }).catch(
        (err) => {
          logger.warn("Hotel search leg failed", { error: err.message });
          return [];
        }
      ),
      (origin
        ? searchFlights({ origin, destination, departureDate, returnDate, adults: travelers })
        : Promise.resolve([])
      ).catch((err) => {
        logger.warn("Flight search leg failed", { error: err.message });
        return [];
      }),
      prisma.loyaltyAccount.findMany({ where: { userId: req.userId } }),
      prisma.awardAvailability.findMany({
        // All of the user's LIVE award rows — we match to this destination below, but fall back to
        // any live route so real award data still surfaces even when the destination format differs
        // (e.g. cached IATA codes vs a city-name hotel search).
        where: { userId: req.userId, expiresAt: { gt: new Date() } },
        orderBy: { pointsCost: "asc" },
      }),
      prisma.subscription.findUnique({ where: { userId: req.userId } }).catch(() => null),
    ]);

    // Prefer award rows for this exact destination (case-insensitive); otherwise use the user's live
    // rows for any route. Distribute the pool across hotels so cards show varied real redemptions.
    const destKey = String(destination).toLowerCase();
    const destMatches = awards.filter((a) => (a.destination || "").toLowerCase() === destKey);
    const awardPool = destMatches.length ? destMatches : awards;

    const hotels = cashHotels.map((hotel, i) => ({
      ...hotel,
      cashOption: {
        priceGbp: hotel.lowestRate,
        supplier: "duffel",
        creditsEarned: round2(hotel.lowestRate * CASHBACK_RATE),
        offerId: hotel.duffelHotelId,
      },
      pointsOption: awardPool.length
        ? buildPointsOption(awardPool[i % awardPool.length], hotel, accounts)
        : null,
    }));

    const flights = cashFlights.map((f) => ({
      ...f,
      id: f.duffelOfferId,
      creditsIfCash: 0, // flights earn no Bonza Credits (3% cashback would wipe the ~3% flight commission)
    }));

    let awardFlights = [];
    if (origin && accounts.length && (!env.proEnforced || isProActive(sub))) {
      awardFlights = await searchAwardFlights({
        origin,
        destination,
        cabin: cabin || "economy",
        programmes: accounts.map((a) => a.programme),
      }).catch(() => []);
    }

    res.json({
      hotels,
      flights,
      awardFlights,
      loyaltyAccounts: accounts,
      searchMeta: { origin: origin || null, destination, departureDate, returnDate, travelers, travelStyle: travelStyle || null },
      preSelectedPackageId: packageId || null,
      mock: !env.hasDuffel,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
