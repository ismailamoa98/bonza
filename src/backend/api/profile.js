// api/profile.js — GET/PATCH user profile (home airport, travel style, onboardingComplete).
const express = require("express");
const { sendError } = require("../utils/AppError");
const prisma = require("../config/database");

const router = express.Router();

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  homeAirport: true,
  travelStyle: true,
  onboardingComplete: true,
  gmailConnected: true,
  outlookConnected: true,
  // Traveller profile (pre-fills the booking guest form).
  title: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  phone: true,
  phoneCountryCode: true,
  passportNumber: true,
};

// Traveller fields accepted on PATCH — trimmed strings, null to clear.
const TRAVELLER_FIELDS = ["title", "firstName", "lastName", "dateOfBirth", "phone", "phoneCountryCode", "passportNumber"];

router.get("/profile", async (req, res, next) => {
  try {
    const profile = await prisma.user.findUnique({ where: { id: req.userId }, select: PROFILE_SELECT });
    if (!profile) return sendError(res, "NOT_FOUND", { message: "User not found" });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

router.patch("/profile", async (req, res, next) => {
  try {
    const body = req.body || {};
    const { homeAirport, travelStyle, onboardingComplete } = body;
    const data = {};

    if (homeAirport !== undefined) {
      if (homeAirport !== null && !/^[A-Za-z]{3}$/.test(String(homeAirport))) {
        return sendError(res, "VALIDATION_FAILED", { message: "homeAirport must be a 3-letter airport code" });
      }
      data.homeAirport = homeAirport ? String(homeAirport).toUpperCase() : null;
    }
    if (travelStyle !== undefined) data.travelStyle = travelStyle ? String(travelStyle) : null;
    if (onboardingComplete === true) data.onboardingComplete = true;

    for (const f of TRAVELLER_FIELDS) {
      if (body[f] !== undefined) data[f] = body[f] ? String(body[f]).trim() || null : null;
    }

    if (!Object.keys(data).length) {
      return sendError(res, "VALIDATION_FAILED", { message: "No updatable fields provided" });
    }

    const profile = await prisma.user.update({ where: { id: req.userId }, data, select: PROFILE_SELECT });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
