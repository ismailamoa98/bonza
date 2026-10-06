// api/priceCalendar.js — Phase 20. Public (optionalAuth). Per-day cash fares + award-seat flags for one month,
// powering the search bar's custom date picker (price on every cell, green dot where award seats exist). All
// numbers are DETERMINISTIC MOCK offline — base fare from a hash of the origin+destination, cheaper midweek,
// dearer on weekends, with a light seasonal wobble; a sparse deterministic set of days carries award seats.
// Requires both from + to (a price needs a route); otherwise returns days: [] so the picker shows dates only.
// Real path later: Duffel price-calendar + Seats.aero (env-gated), same response shape. Never throws.
const express = require("express");
const router = express.Router();
const { optionalAuth } = require("../middleware/optionalAuth");

// Small stable string hash → non-negative int.
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Region-ish base fare from the route (mock): longer/rarer codes trend pricier. Kept in a believable band.
function baseFare(from, to) {
  const h = hash(`${from}->${to}`);
  return 90 + (h % 620); // £90–£710 base
}

// Day-of-week multiplier — cheapest midweek/Saturday, dearest Friday/Sunday.
const DOW_MULT = [1.06, 0.9, 0.86, 0.9, 1.18, 0.88, 1.02]; // Sun..Sat

// GET /api/v1/price-calendar?from=LON&to=JFK&month=2026-10&nights=5
router.get("/", optionalAuth, (req, res) => {
  const from = String(req.query.from || "").toUpperCase();
  const to = String(req.query.to || "").toUpperCase();
  const month = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : null;

  const now = new Date();
  const [y, m] = month ? month.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const monthKey = `${y}-${String(m).padStart(2, "0")}`;

  // No route → dates only (the picker still renders, just without prices).
  if (!from || !to) return res.json({ month: monthKey, currency: "£", days: [], cheapestDate: null });

  const base = baseFare(from, to);
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayIso = now.toISOString().slice(0, 10);
  const seasonal = 1 + 0.08 * Math.sin(((m - 1) / 12) * 2 * Math.PI); // gentle yearly wobble

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${monthKey}-${String(d).padStart(2, "0")}`;
    if (date < todayIso) continue; // no past days
    const dow = new Date(y, m - 1, d).getDay();
    const jitter = 0.9 + (hash(`${from}${to}${date}`) % 40) / 100; // 0.90–1.29
    const cash = Math.round(((base * DOW_MULT[dow] * seasonal * jitter) / 5) * 5); // round to £5
    const award = hash(`aw${from}${to}${date}`) % 3 === 0; // ~1/3 of days
    days.push({ date, cash, award });
  }

  // Cheapest = within ~12% of the month's minimum fare.
  const min = days.length ? Math.min(...days.map((x) => x.cash)) : 0;
  const threshold = min * 1.12;
  let cheapestDate = null;
  for (const x of days) {
    x.cheapest = x.cash <= threshold;
    if (x.cash === min && !cheapestDate) cheapestDate = x.date;
  }

  res.json({ month: monthKey, currency: "£", days, cheapestDate });
});

module.exports = router;
