// api/hotels.js — Hotel search endpoint for the browse-and-optimize grid.
// GET /api/v1/hotels?destination=&maxPrice=&stars=&amenities=&loyalty=&minRating=&sort=
// Returns a filtered hotel array. Reference inventory, so no auth required.
const express = require("express");
const { getHotels } = require("../utils/mockHotels");
const { filterHotels } = require("../utils/filterLogic");

const router = express.Router();

router.get("/", (req, res, next) => {
  try {
    const q = req.query;
    const filters = {
      minPrice: q.minPrice ? Number(q.minPrice) : null,
      maxPrice: q.maxPrice ? Number(q.maxPrice) : null,
      stars: q.stars ? q.stars.split(",").map(Number) : null,
      amenities: q.amenities ? q.amenities.split(",") : null,
      loyalty: q.loyalty ? q.loyalty.split(",") : null,
      minRating: q.minRating ? Number(q.minRating) : null,
      propertyType: q.propertyType ? q.propertyType.split(",") : null,
      freeCancellation: q.freeCancellation === "true",
      breakfast: q.breakfast === "true",
      sort: q.sort || "recommended",
    };

    const hotels = filterHotels(getHotels(q.destination, q.checkIn), filters);
    res.json({ hotels, total: hotels.length, appliedFilters: filters });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
