// services/originResolver.js — Phase 18. Decides which city's popular trips to show. Never blocks: if no
// signal is available it returns London immediately so the rail renders on first paint. Resolution order:
// explicit ?origin= → the signed-in user's homeAirport → CloudFront geo headers → London.
const prisma = require("../config/database");

// Serviced origins, nearest-first fallback. Extend as coverage grows.
const ORIGINS = [
  { code: "LHR", city: "London", country: "GB", lat: 51.47, lon: -0.45 },
  { code: "MAN", city: "Manchester", country: "GB", lat: 53.36, lon: -2.27 },
  { code: "EDI", city: "Edinburgh", country: "GB", lat: 55.95, lon: -3.37 },
  { code: "DUB", city: "Dublin", country: "IE", lat: 53.43, lon: -6.27 },
  { code: "CDG", city: "Paris", country: "FR", lat: 49.01, lon: 2.55 },
  { code: "AMS", city: "Amsterdam", country: "NL", lat: 52.31, lon: 4.76 },
];

const DEFAULT_ORIGIN = ORIGINS[0];

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestOrigin(lat, lon) {
  if (lat == null || lon == null) return DEFAULT_ORIGIN;
  return ORIGINS.reduce(
    (best, o) => (haversineKm({ lat, lon }, o) < haversineKm({ lat, lon }, best) ? o : best),
    ORIGINS[0]
  );
}

// 1. explicit ?origin= (user override) · 2. logged-in homeAirport · 3. CloudFront geo headers · 4. London.
async function resolveOrigin(req) {
  const explicit = req.query.origin?.toUpperCase();
  if (explicit) {
    const match = ORIGINS.find((o) => o.code === explicit);
    if (match) return { ...match, source: "explicit" };
  }

  if (req.userId) {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { homeAirport: true },
    });
    const match = ORIGINS.find((o) => o.code === user?.homeAirport);
    if (match) return { ...match, source: "profile" };
  }

  // CloudFront adds these when the geo-headers behaviour is enabled (§18f). Absent locally → fall through.
  const lat = parseFloat(req.headers["cloudfront-viewer-latitude"]);
  const lon = parseFloat(req.headers["cloudfront-viewer-longitude"]);
  if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
    return { ...nearestOrigin(lat, lon), source: "geo" };
  }

  return { ...DEFAULT_ORIGIN, source: "default" };
}

module.exports = { resolveOrigin, ORIGINS, DEFAULT_ORIGIN };
