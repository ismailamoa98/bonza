// api/destinations.js — Phase 17 hero destination board. Public (no auth): the hero renders for
// logged-out visitors. When a session is present, each row gains an affordability marker.
const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { optionalAuth } = require("../middleware/optionalAuth");
const { resolveOrigin } = require("../services/originResolver");
const { photosFor } = require("../services/explorePhotos");

// Map a resolved airport origin to the ExploreRoute origin city code (LON/MAN/EDI/DUB).
const EXPLORE_ORIGIN = { LHR: "LON", LGW: "LON", MAN: "MAN", EDI: "EDI", DUB: "DUB" };

// GET /api/v1/destinations/hero — slideshow + board data (+ affordability when signed in).
router.get("/hero", optionalAuth, async (req, res, next) => {
  try {
    const destinations = await prisma.heroDestination.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { awards: { orderBy: { sortOrder: "asc" } } },
    });

    const valuations = await prisma.programmeValuation.findMany({
      select: { programme: true, displayName: true, brandColor: true, logoUrl: true, initials: true },
    });
    const valMap = Object.fromEntries(valuations.map((v) => [v.programme, v]));

    // Signed-in only — balances for the affordability markers.
    let balances = {};
    if (req.userId) {
      const accounts = await prisma.loyaltyAccount.findMany({
        where: { userId: req.userId },
        select: { programme: true, balance: true },
      });
      // A user may hold several memberships in one programme — take the highest balance.
      for (const a of accounts) {
        balances[a.programme] = Math.max(balances[a.programme] || 0, a.balance);
      }
    }

    res.json({
      destinations: destinations.map((d) => ({
        slug: d.slug,
        name: d.name,
        tagline: d.tagline,
        originCode: d.originCode,
        destCode: d.destCode,
        routeLabel: d.routeLabel,
        carrier: d.carrier,
        // Return flight in cash — identical across all three cards for the destination.
        flightCash: d.flightCash,
        nights: d.nights,
        adults: d.adults,
        travelMonth: d.travelMonth,
        // Each card carries finished numbers — the frontend only ever adds flight + hotel, never multiplies.
        awards: d.awards.map((a) => {
          const v = valMap[a.programme] || {};
          const allCash = d.flightCash + a.hotelCash;
          const held = balances[a.programme];
          return {
            programme: a.programme,
            programmeName: v.displayName || a.programme,
            brandColor: v.brandColor || "#8A8078",
            logoUrl: v.logoUrl || null,
            initials: v.initials || "?",
            propertyName: a.propertyName,

            // Row 1 — all cash (return flight + whole-stay hotel), with 3% Bonza Credits.
            allCash,
            creditsIfCash: Math.round(allCash * 0.03 * 100) / 100,

            // Row 2 — hotel on points, flight still in cash.
            hybridPoints: a.pointsTotal,
            hybridCash: d.flightCash,
            hybridSaves: a.hotelCash, // hotel outlay avoided — the flight is still paid, so it isn't part of it

            // null when logged out — the card renders identically either way
            userCanAfford: held != null ? held >= a.pointsTotal : null,
          };
        }),
      })),
      isAuthenticated: !!req.userId,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/destinations/discover — Phase 18. Public, session-aware. Country rail + origin-aware trips.
// Optional ?origin=MAN overrides the resolved city.
router.get("/discover", optionalAuth, async (req, res, next) => {
  try {
    const origin = await resolveOrigin(req);

    const [countries, trips, valuations] = await Promise.all([
      prisma.exploreCountry.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, take: 8 }),
      prisma.popularTrip.findMany({
        where: { originCode: origin.code, isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 8,
      }),
      prisma.programmeValuation.findMany({ select: { programme: true, displayName: true, currency: true } }),
    ]);

    const valMap = Object.fromEntries(valuations.map((v) => [v.programme, v]));

    // Signed-in only — which programmes the user actually holds (for the Anywhere tile copy).
    let heldProgrammeCount = 0;
    if (req.userId) {
      const accounts = await prisma.loyaltyAccount.findMany({
        where: { userId: req.userId },
        select: { programme: true, balance: true },
      });
      heldProgrammeCount = new Set(accounts.filter((a) => a.balance > 0).map((a) => a.programme)).size;
    }

    res.json({
      origin: { code: origin.code, city: origin.city, source: origin.source },

      countries: countries.map((c) => ({
        code: c.code,
        name: c.name,
        imageUrl: c.imageUrl,
        gradient: c.gradient,
        fromLabel: c.fromPoints ? `from ${formatPoints(c.fromPoints)} ${c.fromCurrency || "pts"}` : null,
      })),

      trips: trips.map((t) => ({
        id: t.id,
        routeLabel: t.routeLabel,
        originCode: t.originCode,
        destCity: t.destCity,
        destCode: t.destCode,
        imageUrl: t.imageUrl,
        gradient: t.gradient,
        dateLabel: formatDateRange(t.departDate, t.returnDate),
        // ISO dates so the card can open a real search for this exact trip.
        departDate: isoDate(t.departDate),
        returnDate: isoDate(t.returnDate),
        nights: t.nights,
        adults: t.adults,
        cashTotal: t.cashTotal,
        pointsLabel: buildPointsLabel(t, valMap),
        awardAvailable: t.awardAvailable,
      })),

      isAuthenticated: !!req.userId,
      heldProgrammeCount,
    });
  } catch (err) {
    next(err);
  }
});

// 26000 → "26k", 120000 → "120k", 1500 → "1,500"
function formatPoints(n) {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : n.toLocaleString();
}

// "14 Jun – 19 Jun"
function formatDateRange(a, b) {
  const opts = { day: "numeric", month: "short" };
  const from = new Date(a).toLocaleDateString("en-GB", opts);
  const to = new Date(b).toLocaleDateString("en-GB", opts);
  return `${from} – ${to}`;
}

// "18k Avios + 80k pts" | "100k pts + £640" | null when no award route exists
function buildPointsLabel(t, valMap) {
  const parts = [];
  if (t.flightPoints) parts.push(`${formatPoints(t.flightPoints)} ${t.flightCurrency || "pts"}`);
  if (t.hotelPoints) {
    const unit = valMap[t.hotelProgramme]?.currency || "pts";
    parts.push(`${formatPoints(t.hotelPoints)} ${unit}`);
  }
  if (t.residualCash > 0) parts.push(`£${t.residualCash.toLocaleString()}`);
  return parts.length ? parts.join(" + ") : null;
}

const isoDate = (d) => new Date(d).toISOString().split("T")[0];

// GET /api/v1/destinations/country/:code — Phase 18 country landing page. Public, session-aware (origin).
// The country header + its bookable cities as package cards, priced from cached ExploreRoute rows.
router.get("/country/:code", optionalAuth, async (req, res, next) => {
  try {
    const code = String(req.params.code || "").toLowerCase();
    const [origin, valuations, country] = await Promise.all([
      resolveOrigin(req),
      prisma.programmeValuation.findMany({ select: { programme: true, currency: true } }),
      prisma.exploreCountry.findUnique({ where: { code }, include: { cities: true } }),
    ]);
    if (!country) return res.status(404).json({ error: { message: "Unknown country" } });

    const valMap = Object.fromEntries(valuations.map((v) => [v.programme, v]));
    const exploreOrigin = EXPLORE_ORIGIN[origin.code] || "LON";
    const routes = await prisma.exploreRoute.findMany({ where: { originCode: exploreOrigin, countryCode: code } });
    const byCity = new Map();
    let aggregate = null;
    for (const r of routes) {
      if (r.cityId) byCity.set(r.cityId, r);
      else aggregate = r;
    }

    const fmtPoints = (n, programme) => {
      if (!n) return null;
      const unit = valMap[programme]?.currency || "pts";
      return n >= 1000 ? `${Math.round(n / 1000)}k ${unit}` : `${n} ${unit}`;
    };

    const header = {
      code: country.code,
      name: country.name,
      imageUrl: country.imageUrl,
      gradient: country.gradient,
      fromLabel: country.fromPoints
        ? `from ${formatPoints(country.fromPoints)} ${country.fromCurrency || "pts"}`
        : aggregate
        ? `from £${aggregate.cashFrom.toLocaleString()}`
        : null,
    };

    // City cards, priced from the cached routes, enriched with photos + holiday type + hotel cost, cheapest
    // flight first. Photos are city-specific (Unsplash when keyed, keyless loremflickr otherwise).
    const priceable = country.cities.filter((ct) => byCity.has(ct.id));
    const cities = await Promise.all(
      priceable.map(async (ct, i) => {
        const r = byCity.get(ct.id);
        const nights = 5;
        const { depart, ret } = tripWindow(i, nights);
        return {
          id: ct.id,
          code: ct.iataCode,
          name: ct.name,
          originCode: origin.code,
          destCode: ct.iataCode,
          destCity: ct.name,
          routeLabel: `${origin.city} to ${ct.name}`,
          imageUrl: ct.imageUrl,
          gradient: country.gradient,
          photos: await photosFor(ct.name),
          holidayType: ct.holidayType,
          dateLabel: formatDateRange(depart, ret),
          departDate: isoDate(depart),
          returnDate: isoDate(ret),
          nights,
          adults: 2,
          cashTotal: r.cashFrom,
          pointsLabel: fmtPoints(r.pointsFrom, r.pointsProgramme),
          awardAvailable: r.awardSeatsOpen,
          hotelCashFrom: ct.hotelCashFrom,
          hotelPointsLabel: fmtPoints(ct.hotelPointsFrom, ct.hotelProgramme),
          hotelsOnPoints: ct.hotelsOnPoints,
        };
      })
    );
    cities.sort((a, b) => a.cashTotal - b.cashTotal);

    res.json({ origin: { code: origin.code, city: origin.city, source: origin.source }, country: header, cities });
  } catch (err) {
    next(err);
  }
});

// Depart ~6 months out, staggered a little per card; return = depart + nights (never a past date).
function tripWindow(index, nights) {
  const depart = new Date();
  depart.setDate(depart.getDate() + 180 + index * 9);
  const ret = new Date(depart);
  ret.setDate(ret.getDate() + nights);
  return { depart, ret };
}

module.exports = router;
