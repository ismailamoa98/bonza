// api/status.js — Phase 22. Public service status (one source of truth when Duffel/Seats.aero is down).
// Cached 30s. Ordered to match the status page.
const express = require("express");
const router = express.Router();
const prisma = require("../config/database");

const ORDER = ["flight_search", "hotel_search", "award_search", "booking", "balance_sync"];

router.get("/", async (req, res, next) => {
  try {
    const rows = await prisma.serviceStatus.findMany();
    const byService = Object.fromEntries(rows.map((r) => [r.service, r]));
    const services = ORDER.filter((s) => byService[s]).map((s) => {
      const r = byService[s];
      return { service: r.service, displayName: r.displayName, state: r.state, message: r.message, updatedAt: r.updatedAt };
    });
    const incident = services.some((s) => s.state === "degraded" || s.state === "outage");
    res.set("Cache-Control", "public, max-age=30");
    res.json({ services, incident, updatedAt: services.reduce((m, s) => (s.updatedAt > m ? s.updatedAt : m), services[0]?.updatedAt || null) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
