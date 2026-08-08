// api/bookings.js — cash booking flow (payment-intent, confirm-cash via Duffel) + history/cancel.
const express = require("express");
const prisma = require("../config/database");
const { ownedOr403 } = require("../utils/ownedOr403");
const { writeBooking } = require("../utils/bookingWriter");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { createBookingPaymentIntent, retrievePaymentIntent } = require("../services/paymentService");
const { bookCashFlight } = require("../services/duffelService");
const { COMMISSION_RATES } = require("../config/constants");

const router = express.Router();

const NEVER_EXPIRES = new Date("9999-12-31T00:00:00.000Z");

const round2 = (n) => Math.round(Number(n) * 100) / 100;
const LEG_SUPPLIER = { flight: "duffel", hotel: "duffel_stays", car: "cartrawler" };
const LEG_METHOD = { flight: "duffel", hotel: "affiliate_handoff", car: "affiliate_handoff" };

router.post("/", async (req, res, next) => {
  try {
    const { leg, bookingType } = req.body || {};
    if (!leg || !bookingType) {
      const err = new Error("leg and bookingType are required");
      err.status = 400;
      throw err;
    }
    const booking = await writeBooking(req.userId, {
      ...req.body,
      supplier: req.body.supplier || "self_reported",
      confirmationMethod: "self_reported",
    });
    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
});

router.post("/payment-intent", async (req, res, next) => {
  try {
    const { amountGbp } = req.body || {};
    const intent = await createBookingPaymentIntent({
      userId: req.userId,
      amountGbp,
      metadata: { tripId: req.body?.tripId || "" },
    });
    res.json(intent);
  } catch (err) {
    next(err);
  }
});

router.post("/confirm-cash", async (req, res, next) => {
  try {
    const {
      paymentIntentId, bookingToken, journeyId,
      tripId, origin, destination, checkIn, checkOut, travelers, passengers, legs,
    } = req.body || {};

    if (!paymentIntentId) return res.status(400).json({ error: { message: "paymentIntentId is required" } });
    if (!Array.isArray(legs) || !legs.length) {
      return res.status(400).json({ error: { message: "legs must be a non-empty array" } });
    }

    const pi = await retrievePaymentIntent(paymentIntentId);
    if (pi.status !== "succeeded") {
      return res.status(402).json({ error: { message: `Payment not completed (status: ${pi.status})`, code: "PAYMENT_NOT_SUCCEEDED" } });
    }

    let bookingLink = null;
    if (bookingToken) {
      bookingLink = await prisma.bookingLink.findUnique({ where: { token: bookingToken } });
      if (!ownedOr403(bookingLink, req.userId, res)) return;
    }

    const ctx = { journeyId, tripId, origin, destination, checkIn, checkOut, travelers };
    const bookings = [];

    for (const leg of legs) {
      const type = leg.type;
      if (!["flight", "hotel", "car"].includes(type)) continue;
      const cash = leg.cashValueGbp != null ? Number(leg.cashValueGbp) : null;
      let supplierReference = null;

      if (type === "flight") {
        const { order } = await bookCashFlight({
          origin, destination,
          departureDate: checkIn, returnDate: checkOut,
          adults: travelers, passengers, paymentIntentId,
          preferAmount: cash,
        });
        supplierReference = order.bookingReference;
      }

      const booking = await writeBooking(req.userId, {
        ...ctx,
        leg: type,
        bookingType: "cash",
        supplier: LEG_SUPPLIER[type],
        supplierReference,
        description: leg.description || null,
        cashValueGbp: cash,
        serviceFeeGbp: cash != null ? round2(cash * (COMMISSION_RATES[type] || 0)) : null,
        confirmationMethod: LEG_METHOD[type],
      });
      bookings.push(booking);

      if (bookingLink) {
        await prisma.conversion.create({
          data: {
            bookingLinkId: bookingLink.id,
            type,
            vendor: leg.vendor || LEG_SUPPLIER[type],
            bookingId: booking.id,
            commissionAmount: leg.commissionAmount != null ? Number(leg.commissionAmount) : null,
          },
        }).catch(() => {});
      }
    }

    res.status(201).json({ bookings, mock: pi.mock });
  } catch (err) {
    if (err && Array.isArray(err.errors) && err.errors.length) {
      const d = err.errors[0];
      return res.status(502).json({
        error: { message: d.message || d.title, source: "duffel", code: d.code, status: err.meta?.status },
      });
    }
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { status, leg, limit = 20, offset = 0 } = req.query;
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = parseInt(offset, 10) || 0;

    const where = {
      userId: req.userId,
      ...(status ? { status } : {}),
      ...(leg ? { leg } : {}),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { confirmedAt: "desc" },
        take,
        skip,
        include: {
          journey: { select: { recommendedScenario: true, transferConfirmed: true, deepLinkClicked: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ bookings, total, limit: take, offset: skip, hasMore: skip + bookings.length < total });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        journey: true,
        credits: {
          where: { expiresAt: { gt: new Date() } },
          select: { amount: true, source: true, createdAt: true },
        },
      },
    });
    if (!ownedOr403(booking, req.userId, res)) return;
    res.json({ booking });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/cancel", async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!ownedOr403(booking, req.userId, res)) return;

    if (booking.status === "cancelled") {
      return res.status(400).json({ error: { message: "Booking already cancelled" } });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: req.body?.reason || null,
      },
    });

    if (booking.creditsAwarded) {
      await prisma.bonzaCredit.create({
        data: {
          userId: req.userId,
          amount: -booking.creditsAwarded,
          source: "redeemed",
          bookingId: booking.id,
          expiresAt: NEVER_EXPIRES,
        },
      });
    }

    await recordEvent(req.userId, EVENT_TYPES.BOOKING_CANCELLED, {
      bookingId: booking.id,
      reason: req.body?.reason || null,
      reversedCredits: booking.creditsAwarded || 0,
    });

    res.json({ booking: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
