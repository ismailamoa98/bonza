// api/search.js — search results endpoints: hotels (+ detail) and flights, enriched with the user's
// cached award availability, loyalty accounts and cashback estimate. Offline-safe (Duffel mocks).
const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const env = require("../config/env");
const { searchHotels, searchFlights } = require("../services/duffelService");
const { searchAwardFlights } = require("../services/seatsAeroService");
const { isProActive } = require("../middleware/requirePro");
const { CASHBACK_RATE } = require("../config/constants");

const round2 = (n) => parseFloat((n || 0).toFixed(2));

function buildAwardOption(award, hotel, accounts) {
  if (!award) return null;
  return {
    pointsCost: award.pointsCost,
    programme: award.programme,
    centsPerPoint: hotel?.lowestRate ? round2((hotel.lowestRate / award.pointsCost) * 100) : null,
    bookingUrl: award.bookingUrl,
    userCanAfford: accounts.some((a) => a.programme === award.programme && a.balance >= award.pointsCost),
  };
}

// GET /hotels — cash hotels for a destination + points enrichment + cashback estimate.
router.get("/hotels", async (req, res, next) => {
  try {
    const { destination, checkIn, checkOut, adults } = req.query;
    if (!destination || !checkIn || !checkOut) {
      return res.status(400).json({ error: { message: "destination, checkIn and checkOut are required" } });
    }
    const [hotels, accounts, awards] = await Promise.all([
      searchHotels({ location: destination, checkIn, checkOut, adults: parseInt(adults) || 2 }),
      prisma.loyaltyAccount.findMany({ where: { userId: req.userId } }),
      prisma.awardAvailability.findMany({
        where: { userId: req.userId, destination, expiresAt: { gt: new Date() } },
      }),
    ]);
    const enriched = hotels.map((hotel) => ({
      ...hotel,
      awardOption: buildAwardOption(awards.find((a) => a.destination === destination) || awards[0], hotel, accounts),
      creditsIfCash: round2(hotel.lowestRate * CASHBACK_RATE),
    }));
    res.json({ hotels: enriched, total: enriched.length, mock: !env.hasDuffel });
  } catch (err) {
    next(err);
  }
});

// GET /hotel/:hotelId — full detail for the right-hand panel.
router.get("/hotel/:hotelId", async (req, res, next) => {
  try {
    const { checkIn, checkOut, adults, destination } = req.query;
    const hotels = await searchHotels({
      location: destination,
      checkIn,
      checkOut,
      adults: parseInt(adults) || 2,
    });
    const hotel = hotels.find((h) => h.duffelHotelId === req.params.hotelId) || hotels[0] || null;
    const [accounts, award] = await Promise.all([
      prisma.loyaltyAccount.findMany({ where: { userId: req.userId } }),
      prisma.awardAvailability.findFirst({
        where: { userId: req.userId, destination, expiresAt: { gt: new Date() } },
        orderBy: { pointsCost: "asc" },
      }),
    ]);
    res.json({ hotel, awardOption: buildAwardOption(award, hotel, accounts), loyaltyAccounts: accounts });
  } catch (err) {
    next(err);
  }
});

// GET /flights — cash flights (+ cashback) plus award availability for Pro users who hold programmes.
router.get("/flights", async (req, res, next) => {
  try {
    const { origin, destination, outbound, returnDate, adults, cabin } = req.query;
    if (!origin || !destination || !outbound) {
      return res.status(400).json({ error: { message: "origin, destination and outbound are required" } });
    }
    const [flights, accounts, sub] = await Promise.all([
      searchFlights({ origin, destination, departureDate: outbound, returnDate, adults: parseInt(adults) || 2 }),
      prisma.loyaltyAccount.findMany({ where: { userId: req.userId } }),
      prisma.subscription.findUnique({ where: { userId: req.userId } }),
    ]);
    const cashFlights = flights.map((f) => ({
      ...f,
      id: f.duffelOfferId,
      creditsIfCash: round2(f.totalAmount * CASHBACK_RATE),
    }));

    let awardFlights = [];
    if ((!env.proEnforced || isProActive(sub)) && accounts.length) {
      awardFlights = await searchAwardFlights({
        origin,
        destination,
        cabin: cabin || "economy",
        programmes: accounts.map((a) => a.programme),
      });
    }
    res.json({ cashFlights, awardFlights, mock: !env.hasDuffel });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
