// api/hotels.js — Hotel search endpoint for the browse-and-optimize grid.
// GET /api/v1/hotels?destination=&maxPrice=&stars=&amenities=&loyalty=&minRating=&sort=
// Returns a filtered hotel array. Reference inventory, so no auth required.
const express = require("express");
const { getHotels } = require("../utils/mockHotels");
const { filterHotels } = require("../utils/filterLogic");
const { getPropertyReviews } = require("../services/googlePlacesService");

const router = express.Router();

// GET /api/v1/hotels/details?name=&city=&lat=&lng= — genuine place core for the detail panel
// (rating, review count, editorial summary, formatted address, map coords). Google Places when
// connected; offline → { source: "mock" } and the panel falls back to plumbed inventory fields.
// No reviews/aspects here, so opening the panel never triggers Claude. Reuses the service's 30-min cache.
router.get("/details", async (req, res, next) => {
  try {
    const { name, city } = req.query;
    const latitude = req.query.lat != null ? Number(req.query.lat) : undefined;
    const longitude = req.query.lng != null ? Number(req.query.lng) : undefined;
    const g = await getPropertyReviews({ name, city, latitude, longitude });
    res.json({
      source: g.source,
      matched: !!g.matched,
      placeId: g.placeId || null,
      rating: g.rating ?? null,
      total: g.total ?? 0,
      address: g.address || null,
      summary: g.summary || null,
      mapsUri: g.mapsUri || null,
      latitude: g.latitude ?? null,
      longitude: g.longitude ?? null,
    });
  } catch (err) {
    next(err);
  }
});

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
