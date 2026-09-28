// api/explore.js — Phase 18 (Explore Everywhere). Public, session-aware. Returns every priced country for an
// origin (cheapest aggregate route) with its cities, plus continent counts — the data for the /explore map,
// list and grid. Prices are read from cached ExploreRoute rows (seeded mock now; weekly job later).
const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const env = require("../config/env");
const { optionalAuth } = require("../middleware/optionalAuth");
const { landmarkPhotos, hotelPhotos } = require("../services/explorePhotos");
const { airportsFor } = require("../db/cityAirports");
const { landmarksFor } = require("../db/cityLandmarks");

// Programme → plain hotel-chain keyword for a room-photo fallback search.
const CHAIN_KEYWORD = { world_of_hyatt: "Hyatt", marriott_bonvoy: "Marriott", hilton_honors: "Hilton" };

const FALLBACK_ORIGIN = "LON";
// Award prices, named hotels and availability are only real once the refresh job runs against live keys
// (Duffel for fares, Seats.aero for award seats, rooms.aero for award hotels). Offline they are seeded mock,
// so the drawer must label them as sample — this flag drops to false automatically once the keys are set.
const IS_SAMPLE = !(env.hasDuffel && env.hasSeatsAero);
const monthLabel = (m, opts) => new Date(`${m}-01`).toLocaleDateString("en-GB", opts);

// GET /api/v1/explore?origin=LON
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const origin = String(req.query.origin || FALLBACK_ORIGIN).toUpperCase();

    const [countries, routes, valuations] = await Promise.all([
      prisma.exploreCountry.findMany({ where: { isActive: true }, include: { cities: true }, orderBy: { name: "asc" } }),
      prisma.exploreRoute.findMany({ where: { originCode: origin } }),
      prisma.programmeValuation.findMany({ select: { programme: true, currency: true } }),
    ]);
    // No routes for this origin → fall back to London so the page never renders empty.
    let usedOrigin = origin;
    let usedRoutes = routes;
    if (!routes.length && origin !== FALLBACK_ORIGIN) {
      usedOrigin = FALLBACK_ORIGIN;
      usedRoutes = await prisma.exploreRoute.findMany({ where: { originCode: FALLBACK_ORIGIN } });
    }

    const valMap = Object.fromEntries(valuations.map((v) => [v.programme, v]));
    const byCountry = new Map();
    const byCity = new Map();
    for (const r of usedRoutes) {
      if (r.cityId) byCity.set(r.cityId, r);
      else byCountry.set(r.countryCode, r);
    }

    const fmtPoints = (n, programme) => {
      if (!n) return null;
      const unit = valMap[programme]?.currency || "pts";
      return n >= 1000 ? `${Math.round(n / 1000)}k ${unit}` : `${n} ${unit}`;
    };

    // Only countries we have a price for — a pin with no price is noise.
    const priced = countries
      .filter((c) => byCountry.has(c.code))
      .map((c) => {
        const r = byCountry.get(c.code);
        return {
          code: c.code,
          name: c.name,
          continent: c.continent,
          latitude: c.latitude,
          longitude: c.longitude,
          imageUrl: c.imageUrl,
          gradient: c.gradient,
          cashFrom: r.cashFrom,
          pointsLabel: fmtPoints(r.pointsFrom, r.pointsProgramme),
          awardSeatsOpen: r.awardSeatsOpen,
          cityCount: c.cities.length,
          cities: c.cities
            .filter((ct) => byCity.has(ct.id))
            .map((ct) => {
              const cr = byCity.get(ct.id);
              return {
                id: ct.id,
                name: ct.name,
                iataCode: ct.iataCode,
                imageUrl: ct.imageUrl,
                hotelsOnPoints: ct.hotelsOnPoints,
                cashFrom: cr.cashFrom,
                pointsLabel: fmtPoints(cr.pointsFrom, cr.pointsProgramme),
                awardSeatsOpen: cr.awardSeatsOpen,
              };
            })
            .sort((a, b) => a.cashFrom - b.cashFrom),
        };
      })
      .sort((a, b) => a.cashFrom - b.cashFrom);

    const continents = [...new Set(priced.map((c) => c.continent))].map((name) => ({
      name,
      count: priced.filter((c) => c.continent === name).length,
    }));

    res.json({
      origin: usedOrigin,
      countries: priced,
      continents,
      total: priced.length,
      refreshedAt: usedRoutes[0]?.refreshedAt ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/explore/city/:cityId?origin=LON — §18i city drawer: gallery, trip total, hotels on points,
// six-month availability. Public. Totals + points are computed/formatted server-side.
router.get("/city/:cityId", optionalAuth, async (req, res, next) => {
  try {
    const origin = String(req.query.origin || FALLBACK_ORIGIN).toUpperCase();
    const city = await prisma.exploreCity.findUnique({
      where: { id: req.params.cityId },
      include: {
        country: true,
        hotels: { orderBy: { sortOrder: "asc" } },
        availability: { where: { originCode: origin }, orderBy: { month: "asc" } },
      },
    });
    if (!city) return res.status(404).json({ error: { message: "Not found" } });

    const [route, valuations] = await Promise.all([
      prisma.exploreRoute.findUnique({
        where: { originCode_countryCode_cityId: { originCode: origin, countryCode: city.countryCode, cityId: city.id } },
      }),
      prisma.programmeValuation.findMany({
        select: { programme: true, displayName: true, brandColor: true, logoUrl: true, initials: true, currency: true },
      }),
    ]);
    const valMap = Object.fromEntries(valuations.map((v) => [v.programme, v]));
    const fmt = (n, p) => {
      if (!n) return null;
      const unit = valMap[p]?.currency || "pts";
      return n >= 1000 ? `${Math.round(n / 1000)}k ${unit}` : `${n} ${unit}`;
    };

    const flightCash = route?.cashFrom ?? null;
    const hotelCash = city.hotelCashFrom ?? null;
    const cheapestHotel = city.hotels[0] ?? null;

    // Best month by seats, tie-broken by cheapest points.
    const best =
      [...city.availability]
        .filter((a) => a.seatsFound > 0)
        .sort((a, b) => b.seatsFound - a.seatsFound || (a.cheapestPoints ?? 1e9) - (b.cheapestPoints ?? 1e9))[0] ?? null;

    res.json({
      city: {
        id: city.id,
        name: city.name,
        iataCode: city.iataCode,
        airports: airportsFor(city.iataCode, city.name),
        tagline: city.holidayType,
        countryName: city.country.name,
        images: await landmarkPhotos({ landmarks: landmarksFor(city.iataCode), city: city.name, country: city.country.name, n: 6 }),
      },
      origin,
      nights: 5,
      adults: 2,
      sample: IS_SAMPLE,
      flight: flightCash
        ? {
            cash: flightCash,
            pointsLabel: fmt(route.pointsFrom, route.pointsProgramme),
            carrier: city.carrier,
            isDirect: city.isDirect,
            durationLabel: city.flightMinutes ? `${Math.floor(city.flightMinutes / 60)}h ${city.flightMinutes % 60}m` : null,
          }
        : null,
      hotel: hotelCash != null
        ? { cash: hotelCash, pointsLabel: cheapestHotel ? fmt(cheapestHotel.pointsTotal, cheapestHotel.programme) : null, propertyCount: city.hotels.length }
        : null,
      // Server-side total — the frontend adds nothing.
      totals:
        flightCash != null && hotelCash != null
          ? {
              allCash: flightCash + hotelCash,
              hybridLabel: cheapestHotel
                ? `${fmt(cheapestHotel.pointsTotal, cheapestHotel.programme)} + £${flightCash.toLocaleString()}`
                : null,
            }
          : null,
      hotels: await Promise.all(
        city.hotels.map(async (h) => {
          const v = valMap[h.programme] || {};
          return {
            programme: h.programme,
            programmeName: v.displayName || h.programme,
            brandColor: v.brandColor || "#8A8078",
            logoUrl: v.logoUrl || null,
            initials: v.initials || "?",
            propertyName: h.propertyName,
            starRating: h.starRating,
            pointsTotal: h.pointsTotal,
            images: await hotelPhotos(h.propertyName, CHAIN_KEYWORD[h.programme], 6),
          };
        })
      ),
      availability: city.availability.map((a) => ({
        month: a.month,
        label: monthLabel(a.month, { month: "short" }),
        seatsFound: a.seatsFound,
        state: a.seatsFound === 0 ? "none" : best && a.month === best.month ? "best" : "open",
        cheapestPoints: a.cheapestPoints ?? null, // raw — lets the drawer pick the least-points month for a flexible search
        pointsLabel: fmt(a.cheapestPoints, a.programme),
      })),
      bestMonth: best
        ? { label: monthLabel(best.month, { month: "long" }), seatsFound: best.seatsFound, pointsLabel: fmt(best.cheapestPoints, best.programme) }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/explore/:code?origin=LON&month=2026-10&nights=5&adults=2 — Phase 19 country page. Public. The
// prices recompute against the controls: hotel figures scale with `nights` (award charts are per-night),
// flights are per-trip and do not scale. Registered LAST so the single-segment :code never shadows /city/:id.
// Scaling is a browse-only approximation (peak nights / free-night thresholds ignored) — never in real search.
router.get("/:code", optionalAuth, async (req, res, next) => {
  try {
    const code = String(req.params.code).toLowerCase();
    const origin = String(req.query.origin || FALLBACK_ORIGIN).toUpperCase();
    const month = req.query.month || null; // '2026-10' | null = any
    const nights = Math.max(1, parseInt(req.query.nights || "5", 10) || 5);
    const adults = Math.max(1, parseInt(req.query.adults || "2", 10) || 2);

    const country = await prisma.exploreCountry.findUnique({
      where: { code },
      include: {
        cities: {
          include: {
            hotels: { orderBy: { sortOrder: "asc" } },
            availability: { where: { originCode: origin } },
          },
        },
      },
    });
    if (!country) return res.status(404).json({ error: { message: "Not found" } });

    const [routes, valuations] = await Promise.all([
      prisma.exploreRoute.findMany({ where: { originCode: origin, countryCode: code, cityId: { not: null } } }),
      prisma.programmeValuation.findMany({ select: { programme: true, currency: true, displayName: true } }),
    ]);
    const valMap = Object.fromEntries(valuations.map((v) => [v.programme, v]));
    const routeMap = new Map(routes.map((r) => [r.cityId, r]));

    const fmt = (n, p) => {
      if (!n) return null;
      const unit = valMap[p]?.currency || "pts";
      return n >= 1000 ? `${Math.round(n / 1000)}k ${unit}` : `${n} ${unit}`;
    };
    // Cached figures assume the seeded 5-night window. Scale the hotel side only; flights are per trip.
    const scaleHotel = (n) => Math.round(n * (nights / 5));

    const cities = country.cities
      .filter((c) => routeMap.has(c.id))
      .map((c) => {
        const r = routeMap.get(c.id);
        const cheapestHotel = c.hotels[0] ?? null;
        const monthRow = month
          ? c.availability.find((a) => a.month === month) ?? null
          : c.availability.find((a) => a.seatsFound > 0) ?? null;
        const flightCash = r.cashFrom;
        const hotelCash = c.hotelCashFrom != null ? scaleHotel(c.hotelCashFrom) : null;
        return {
          id: c.id,
          name: c.name,
          iataCode: c.iataCode,
          imageUrl: c.imageUrl,
          tripType: c.holidayType, // reuse holidayType as the card chip / trip-type filter
          hotelCount: c.hotels.length,
          isDirect: c.isDirect,
          flight: { cash: flightCash, pointsLabel: fmt(r.pointsFrom, r.pointsProgramme) },
          // A cash hotel may exist without any award property — show the cash figure, points only when bookable.
          hotel: hotelCash != null
            ? { cash: hotelCash, pointsLabel: cheapestHotel ? fmt(scaleHotel(cheapestHotel.pointsTotal), cheapestHotel.programme) : null }
            : null,
          allCash: flightCash != null && hotelCash != null ? flightCash + hotelCash : null,
          awardSeatsOpen: (monthRow?.seatsFound ?? 0) > 0,
        };
      })
      .sort((a, b) => (a.allCash ?? Infinity) - (b.allCash ?? Infinity));

    // Best month across the whole country (most seats), and cheapest cash / points entry points.
    const byMonth = new Map();
    for (const c of country.cities) for (const a of c.availability) byMonth.set(a.month, (byMonth.get(a.month) ?? 0) + a.seatsFound);
    const bestMonth = [...byMonth.entries()].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1])[0] ?? null;
    const cheapestCash = Math.min(...cities.map((c) => c.flight.cash).filter((n) => n != null));
    const cheapestHotelRow = country.cities.flatMap((c) => c.hotels).sort((a, b) => a.pointsTotal - b.pointsTotal)[0] ?? null;

    res.json({
      country: {
        code: country.code,
        name: country.name,
        continent: country.continent,
        heroImageUrl: country.heroImageUrl,
        imageUrl: country.imageUrl, // hero fallback before the gradient
        gradient: country.gradient,
        blurb: country.blurb,
      },
      origin,
      month,
      nights,
      adults,
      cities,
      stats: {
        cityCount: cities.length,
        cheapestCash: Number.isFinite(cheapestCash) ? cheapestCash : null,
        cheapestPointsLabel: cheapestHotelRow ? fmt(scaleHotel(cheapestHotelRow.pointsTotal), cheapestHotelRow.programme) : null,
        bestMonthLabel: bestMonth ? monthLabel(bestMonth[0], { month: "short" }) : null,
      },
      tripTypes: [...new Set(cities.map((c) => c.tripType).filter(Boolean))],
      refreshedAt: routes[0]?.refreshedAt ?? null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
