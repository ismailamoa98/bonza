// api/booking.js — Booking link endpoints.
// POST /api/v1/create-booking-link { tripId, selectedScenarioId } — creates a
// unique booking link plus three separate affiliate links (flight/hotel/car),
// each with its own tracking id.
const express = require("express");
const prisma = require("../config/database");
const { generateAffiliateLinks } = require("../utils/affiliateLinkGenerator");
const { BOOKING_LINK_TTL_DAYS, APP_BOOKING_BASE } = require("../config/constants");

const router = express.Router();

router.post("/create-booking-link", async (req, res, next) => {
  try {
    const { tripId, selectedScenarioId, selectedVendors } = req.body || {};
    if (!tripId) {
      const err = new Error("tripId is required");
      err.status = 400;
      throw err;
    }

    const trip = await prisma.trip.findFirst({ where: { id: tripId, userId: req.userId } });
    if (!trip) {
      const err = new Error("Trip not found");
      err.status = 404;
      throw err;
    }

    const scenario = selectedScenarioId
      ? await prisma.scenario.findUnique({ where: { id: selectedScenarioId } })
      : null;

    const expiresAt = new Date(Date.now() + BOOKING_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);

    const bookingLink = await prisma.bookingLink.create({
      data: {
        userId: req.userId,
        tripId,
        selectedScenarioId: selectedScenarioId || null,
        expiresAt,
      },
    });

    const links = generateAffiliateLinks(
      trip,
      scenario || {},
      bookingLink.token,
      selectedVendors || {}
    );

    // Persist each affiliate link.
    await prisma.affiliateLink.createMany({
      data: [links.flight, links.hotel, links.car].map((l) => ({
        bookingLinkId: bookingLink.id,
        type: l.type,
        vendor: l.vendor,
        affiliateUrl: l.affiliateUrl,
        trackingId: l.trackingId,
        commissionRate: l.commissionRate,
      })),
    });

    res.status(201).json({
      bookingLink: {
        token: bookingLink.token,
        url: `${APP_BOOKING_BASE}/book/${bookingLink.token}`,
        expiresAt: bookingLink.expiresAt,
      },
      affiliateLinks: links,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
