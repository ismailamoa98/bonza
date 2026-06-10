// api/trips.js — Trip endpoints.
// POST /api/v1/trips — create a trip. Loyalty points are auto-filled from the
// mock Plaid source; preferences come from the request body.
const express = require("express");
const prisma = require("../config/database");
const { getMockPlaidData } = require("../utils/mockPlaidData");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const {
      origin,
      destination,
      checkIn,
      checkOut,
      budget,
      numberOfTravelers,
      flexibility,
      preferences,
    } = req.body || {};

    if (!origin || !destination || !checkIn || !checkOut) {
      const err = new Error("origin, destination, checkIn, and checkOut are required");
      err.status = 400;
      throw err;
    }

    const trip = await prisma.trip.create({
      data: {
        userId: req.userId,
        origin,
        destination,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        // Optional — 0 means "no cash ceiling; optimize within my points".
        budget: budget === "" || budget == null ? 0 : Number(budget),
        numberOfTravelers: Number(numberOfTravelers) || 1,
        flexibility: Boolean(flexibility),
        loyaltyPoints: getMockPlaidData(req.userId),
        preferences: preferences || {},
      },
    });

    res.status(201).json({ id: trip.id, status: "created" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
