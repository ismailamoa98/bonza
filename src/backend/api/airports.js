// api/airports.js — Airport search endpoint.
// GET /api/v1/airports?q=<term> — returns up to ~8 matching airports for the
// searchable dropdown on Step 1. Reference lookup, so no auth required.
const express = require("express");
const { searchAirports } = require("../utils/airportSearch");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const airports = await searchAirports(req.query.q);
    res.json({ airports });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
