// api/reviews.js — property reviews for the detail panel (auth applied at mount in server.js).
//   GET  /            → { placeId, google, aspects, bonza, canReview }
//   POST /bonza       → submit a verified Bonza review (must have a confirmed booking for the property)
const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { getPropertyReviews } = require("../services/googlePlacesService");
const { getAspectInsights } = require("../services/reviewInsightsService");

// Shape a stored Bonza review for the client.
function toBonza(r) {
  return {
    author: r.user?.name || "Bonza guest",
    verified: true,
    rating: r.rating,
    location: r.location,
    comfort: r.comfort,
    facilities: r.facilities,
    text: r.text,
    relativeTime: new Date(r.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { name, city, lat, lng } = req.query;
    const latitude = lat != null && lat !== "" ? parseFloat(lat) : undefined;
    const longitude = lng != null && lng !== "" ? parseFloat(lng) : undefined;

    const google = await getPropertyReviews({
      name,
      city,
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
    });

    const placeId = google.placeId || null;

    // Bonza verified reviews for this property (keyed by place_id).
    let bonza = [];
    if (placeId) {
      const rows = await prisma.propertyReview.findMany({
        where: { placeId, status: "published" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      });
      bonza = rows.map(toBonza);
    }

    // Aspect scores analysed from all available review text (Google + Bonza).
    const reviewTexts = [...(google.reviews || []), ...bonza.map((b) => ({ text: b.text }))];
    const aspects = await getAspectInsights({
      placeId,
      name,
      city,
      reviews: reviewTexts,
      rating: google.rating,
    });

    // Can the signed-in user post a verified review? (confirmed hotel booking for this property, none yet)
    let canReview = false;
    if (placeId && req.userId) {
      const [booked, already] = await Promise.all([
        prisma.booking.findFirst({
          where: { userId: req.userId, leg: "hotel", status: "confirmed", propertyPlaceId: placeId },
          select: { id: true },
        }),
        prisma.propertyReview.findUnique({
          where: { userId_placeId: { userId: req.userId, placeId } },
          select: { id: true },
        }),
      ]);
      canReview = Boolean(booked) && !already;
    }

    res.json({ placeId, google, aspects, bonza, canReview });
  } catch (err) {
    next(err);
  }
});

router.post("/bonza", async (req, res, next) => {
  try {
    const { placeId, propertyName, rating, location, comfort, facilities, text } = req.body || {};
    if (!placeId || !rating || !text || !String(text).trim()) {
      return res.status(400).json({ error: { message: "placeId, rating and text are required" } });
    }

    // Verified-stay guard: the user must have a confirmed hotel booking for this exact property.
    const booking = await prisma.booking.findFirst({
      where: { userId: req.userId, leg: "hotel", status: "confirmed", propertyPlaceId: placeId },
      select: { id: true },
    });
    if (!booking) {
      return res
        .status(403)
        .json({ error: { code: "MUST_HAVE_BOOKED", message: "Only guests who booked this property via Bonza can review it." } });
    }

    const clamp5 = (n) => Math.max(1, Math.min(5, Math.round(Number(n))));
    const review = await prisma.propertyReview.upsert({
      where: { userId_placeId: { userId: req.userId, placeId } },
      create: {
        userId: req.userId,
        bookingId: booking.id,
        placeId,
        propertyName: propertyName || null,
        rating: clamp5(rating),
        location: location != null ? clamp5(location) : null,
        comfort: comfort != null ? clamp5(comfort) : null,
        facilities: facilities != null ? clamp5(facilities) : null,
        text: String(text).slice(0, 2000),
      },
      update: {
        rating: clamp5(rating),
        location: location != null ? clamp5(location) : null,
        comfort: comfort != null ? clamp5(comfort) : null,
        facilities: facilities != null ? clamp5(facilities) : null,
        text: String(text).slice(0, 2000),
      },
      include: { user: { select: { name: true } } },
    });

    res.status(201).json({ review: toBonza(review) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
