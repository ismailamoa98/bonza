// api/journeys.js — journey attribution: confirm off-platform booking + confirm points transfer (Pro).
const express = require("express");
const prisma = require("../config/database");
const requirePro = require("../middleware/requirePro");
const { ownedOr403 } = require("../utils/ownedOr403");
const { writeBooking } = require("../utils/bookingWriter");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

router.post("/confirm-booking", async (req, res, next) => {
  try {
    const { journeyId, leg } = req.body || {};
    if (!journeyId) {
      const err = new Error("journeyId is required");
      err.status = 400;
      throw err;
    }

    const journey = await prisma.userJourney.findUnique({ where: { id: journeyId } });
    if (!ownedOr403(journey, req.userId, res)) return;
    if (journey.bookingConfirmed) return res.json({ alreadyConfirmed: true });

    const bookingLeg = leg || journey.deepLinkLeg || "flight";
    recordEvent(req.userId, EVENT_TYPES.BOOKING_SELF_REPORTED, { journeyId, leg: bookingLeg });

    const booking = await writeBooking(req.userId, {
      journeyId,
      tripId: journey.tripId,
      origin: journey.origin,
      destination: journey.destination,
      leg: bookingLeg,
      bookingType: "points",
      supplier: journey.recommendedProgramme || "self_reported",
      description: journey.destination ? `Points booking — ${journey.destination}` : "Points booking",
      pointsUsed: journey.pointsRecommended || null,
      pointsProgramme: journey.recommendedProgramme || null,
      confirmationMethod: "self_reported",
    });

    res.json({ confirmed: true, bookingId: booking.id });
  } catch (err) {
    next(err);
  }
});

router.post("/confirm-transfer", requirePro, async (req, res, next) => {
  try {
    const { journeyId, fromProgramme, toProgramme, amount } = req.body || {};
    if (!journeyId) {
      const err = new Error("journeyId is required");
      err.status = 400;
      throw err;
    }

    const journey = await prisma.userJourney.findUnique({ where: { id: journeyId } });
    if (!ownedOr403(journey, req.userId, res)) return;

    await prisma.userJourney.update({
      where: { id: journeyId },
      data: {
        transferConfirmed: true,
        transferProgramme: fromProgramme || null,
        transferToProgramme: toProgramme || null,
        transferAmount: amount != null ? Number(amount) : null,
        transferConfirmedAt: new Date(),
      },
    });
    recordEvent(req.userId, EVENT_TYPES.TRANSFER_CONFIRMED, { journeyId, fromProgramme, toProgramme, amount });

    let bookingConfirmed = false;
    const recentClick =
      journey.deepLinkClicked &&
      journey.deepLinkClickedAt &&
      journey.deepLinkClickedAt > new Date(Date.now() - DAY_MS);

    if (recentClick && !journey.bookingConfirmed) {
      await writeBooking(req.userId, {
        journeyId,
        tripId: journey.tripId,
        origin: journey.origin,
        destination: journey.destination,
        leg: journey.deepLinkLeg || "flight",
        bookingType: "points",
        supplier: toProgramme || journey.recommendedProgramme || "transfer_proxy",
        description: journey.destination ? `Points booking — ${journey.destination}` : "Points booking",
        pointsUsed: amount != null ? Number(amount) : journey.pointsRecommended || null,
        pointsProgramme: toProgramme || journey.recommendedProgramme || null,
        confirmationMethod: "transfer_proxy",
      });
      bookingConfirmed = true;
    }

    res.json({ transferRecorded: true, bookingConfirmed });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
