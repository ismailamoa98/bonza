// api/inventory.js — cash inventory search via Duffel (flights + hotels).
// duffelService returns real or mock data based on env.hasDuffel, so these endpoints
// work offline; the `mock` flag marks which path ran.
const express = require("express");
const env = require("../config/env");
const prisma = require("../config/database");
const requirePro = require("../middleware/requirePro");
const { searchFlights, confirmFlightPrice, searchHotels, bookFlight } = require("../services/duffelService");
const { searchAwardFlights } = require("../services/seatsAeroService");
const { searchAwardHotels } = require("../services/gondolaService");
const { writeBooking } = require("../utils/bookingWriter");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");

const router = express.Router();

// Surface upstream Duffel API errors (auth, validation, etc.) instead of masking
// them as a generic 500 — Duffel errors carry { meta.status, errors[] }.
function handleErr(res, next, err) {
  if (err && Array.isArray(err.errors) && err.errors.length) {
    const d = err.errors[0];
    return res.status(502).json({
      error: { message: d.message || d.title, source: "duffel", code: d.code, status: err.meta?.status },
    });
  }
  return next(err);
}

router.post("/flights/search", async (req, res, next) => {
  try {
    const { origin, destination, departureDate, returnDate, adults } = req.body;
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ error: { message: "origin, destination and departureDate are required" } });
    }
    const flights = await searchFlights({ origin, destination, departureDate, returnDate, adults });
    res.json({ flights, mock: !env.hasDuffel });
  } catch (err) {
    handleErr(res, next, err);
  }
});

router.post("/flights/confirm-price", async (req, res, next) => {
  try {
    const { offerId } = req.body;
    if (!offerId) return res.status(400).json({ error: { message: "offerId is required" } });
    const confirmed = await confirmFlightPrice(offerId);
    res.json({ ...confirmed, mock: !env.hasDuffel });
  } catch (err) {
    handleErr(res, next, err);
  }
});

// Confirm a Duffel cash flight booking on-site, then record it (writeBooking → the
// 'duffel' confirmation path). Gated on a real Duffel key; trip context + cash value
// come from the client (carried through from the confirm-price step).
router.post("/flights/book", async (req, res, next) => {
  try {
    // Works offline too: bookFlight falls back to a deterministic mock order when no
    // Duffel key is set (mirrors search/confirm-price). /bookings/confirm-cash is the
    // path the UI uses; this stays for API symmetry + direct single-leg booking.
    const {
      offerId, passengers, paymentIntentId,
      journeyId, tripId, origin, destination, checkIn, checkOut, travelers, cashValueGbp, description,
    } = req.body || {};
    if (!offerId || !passengers) {
      return res.status(400).json({ error: { message: "offerId and passengers are required" } });
    }

    const order = await bookFlight({ offerId, passengers, paymentIntentId });
    const cash = cashValueGbp != null ? Number(cashValueGbp) : null;
    const booking = await writeBooking(req.userId, {
      journeyId, tripId, origin, destination, checkIn, checkOut, travelers,
      leg: "flight",
      bookingType: "cash",
      supplier: "duffel",
      supplierReference: order.bookingReference,
      description,
      cashValueGbp: cash,
      serviceFeeGbp: cash != null ? Math.round(cash * 0.03 * 100) / 100 : null,
      confirmationMethod: "duffel",
    });

    res.status(201).json({ order, booking });
  } catch (err) {
    handleErr(res, next, err);
  }
});

router.post("/hotels/search", async (req, res, next) => {
  try {
    const { location, checkIn, checkOut, adults, rooms } = req.body;
    if (!location || !checkIn || !checkOut) {
      return res.status(400).json({ error: { message: "location, checkIn and checkOut are required" } });
    }
    const hotels = await searchHotels({ location, checkIn, checkOut, adults, rooms });
    res.json({ hotels, mock: !env.hasDuffel });
  } catch (err) {
    handleErr(res, next, err);
  }
});

// Award (points) flight availability — Pro-gated. Filters to the programmes the
// user holds (LoyaltyAccount from 8b) and attaches loyalty-portal deep-links.
router.post("/flights/award-search", requirePro, async (req, res, next) => {
  try {
    const { origin, destination, cabin } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: { message: "origin and destination are required" } });
    }
    const accounts = await prisma.loyaltyAccount.findMany({ where: { userId: req.userId } });
    const programmes = accounts.map((a) => a.programme);
    const awards = await searchAwardFlights({ origin, destination, cabin, programmes });
    recordEvent(req.userId, EVENT_TYPES.AWARD_SEARCH_RUN, {
      kind: "flight",
      origin,
      destination,
      programmes,
      results: awards.length,
    });
    res.json({ awards, mock: !env.hasSeatsAero });
  } catch (err) {
    next(err);
  }
});

// Award (points) hotel availability — Pro-gated. Cash + per-programme points pricing
// (Gondola). Mock-backed offline; the authoritative real path is the optimizer's
// Claude + Gondola MCP connector.
router.post("/hotels/award-search", requirePro, async (req, res, next) => {
  try {
    const { location, checkIn, checkOut } = req.body;
    if (!location || !checkIn || !checkOut) {
      return res.status(400).json({ error: { message: "location, checkIn and checkOut are required" } });
    }
    const accounts = await prisma.loyaltyAccount.findMany({ where: { userId: req.userId } });
    const programmes = accounts.map((a) => a.programme);
    const hotels = await searchAwardHotels({ location, checkIn, checkOut, programmes });
    recordEvent(req.userId, EVENT_TYPES.AWARD_SEARCH_RUN, {
      kind: "hotel",
      location,
      programmes,
      results: hotels.length,
    });
    res.json({ hotels, mock: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
