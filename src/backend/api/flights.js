// api/flights.js — Flight search endpoint for the browse-and-optimize grid.
// GET /api/v1/flights?from=&to=&maxPrice=&airlines=&cabin=&departureTime=&stops=&minDuration=&maxDuration=&sort=
// Returns a filtered flight array. Reference inventory, so no auth required.
const express = require("express");
const { getFlights } = require("../utils/mockFlights");
const { filterFlights } = require("../utils/filterLogic");

const router = express.Router();

router.get("/", (req, res, next) => {
  try {
    const q = req.query;
    const filters = {
      minPrice: q.minPrice ? Number(q.minPrice) : null,
      maxPrice: q.maxPrice ? Number(q.maxPrice) : null,
      airlines: q.airlines ? q.airlines.split(",") : null,
      cabin: q.cabin || null,
      departureTime: q.departureTime ? q.departureTime.split(",") : null,
      stops: q.stops != null && q.stops !== "" ? Number(q.stops) : null,
      minDuration: q.minDuration ? Number(q.minDuration) : null,
      maxDuration: q.maxDuration ? Number(q.maxDuration) : null,
      sort: q.sort || "recommended",
    };

    const flights = filterFlights(getFlights(q.from, q.to, q.checkIn), filters);
    res.json({ flights, total: flights.length, appliedFilters: filters });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
