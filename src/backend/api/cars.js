// api/cars.js — Rental-car search endpoint for the browse-and-optimize grid.
// GET /api/v1/cars?location=&maxPrice=&carClass=&vendors=&sort=
// Returns a filtered car array. Reference inventory, so no auth required.
const express = require("express");
const { getCars } = require("../utils/mockCars");
const { filterCars } = require("../utils/filterLogic");

const router = express.Router();

router.get("/", (req, res, next) => {
  try {
    const q = req.query;
    const filters = {
      minPrice: q.minPrice ? Number(q.minPrice) : null,
      maxPrice: q.maxPrice ? Number(q.maxPrice) : null,
      carClass: q.carClass ? q.carClass.split(",") : null,
      vendors: q.vendors ? q.vendors.split(",") : null,
      sort: q.sort || "recommended",
    };

    const cars = filterCars(getCars(q.location, q.checkIn), filters);
    res.json({ cars, total: cars.length, appliedFilters: filters });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
