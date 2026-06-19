// api/conversion.js — Conversion recording endpoint.
// POST /api/v1/conversion { bookingToken, type, vendor, bookingId,
// commissionAmount } — records a Conversion against a booking link. Each
// booking type (flight/hotel/car) is tracked separately.
const express = require("express");
const prisma = require("../config/database");
const { ownedOr403 } = require("../utils/ownedOr403");

const router = express.Router();

router.post("/conversion", async (req, res, next) => {
  try {
    const { bookingToken, type, vendor, bookingId, commissionAmount } = req.body || {};
    if (!bookingToken || !type || !vendor) {
      const err = new Error("bookingToken, type, and vendor are required");
      err.status = 400;
      throw err;
    }

    const bookingLink = await prisma.bookingLink.findUnique({ where: { token: bookingToken } });
    // Only the booking link's owner may record conversions against it (IDOR guard).
    if (!ownedOr403(bookingLink, req.userId, res)) return;

    const conversion = await prisma.conversion.create({
      data: {
        bookingLinkId: bookingLink.id,
        type,
        vendor,
        bookingId: bookingId || null,
        commissionAmount: commissionAmount != null ? Number(commissionAmount) : null,
      },
    });

    res.status(201).json({ tracked: true, conversionId: conversion.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
