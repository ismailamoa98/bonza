// api/profile.js — GET/PATCH user profile (home airport, travel style, onboardingComplete).
const express = require("express");
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
};

router.get("/profile", async (req, res, next) => {
  try {
    const profile = await prisma.user.findUnique({ where: { id: req.userId }, select: PROFILE_SELECT });
    if (!profile) return res.status(404).json({ error: { message: "User not found" } });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

router.patch("/profile", async (req, res, next) => {
  try {
    const { homeAirport, travelStyle, onboardingComplete } = req.body || {};
    const data = {};

    if (homeAirport !== undefined) {
      if (homeAirport !== null && !/^[A-Za-z]{3}$/.test(String(homeAirport))) {
        return res.status(400).json({ error: { message: "homeAirport must be a 3-letter airport code" } });
      }
      data.homeAirport = homeAirport ? String(homeAirport).toUpperCase() : null;
    }
    if (travelStyle !== undefined) data.travelStyle = travelStyle ? String(travelStyle) : null;
    if (onboardingComplete === true) data.onboardingComplete = true;

    if (!Object.keys(data).length) {
      return res.status(400).json({ error: { message: "No updatable fields provided" } });
    }

    const profile = await prisma.user.update({ where: { id: req.userId }, data, select: PROFILE_SELECT });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
