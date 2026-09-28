// jobs/exploreRefreshJob.js — Phase 18 (Explore Everywhere). Weekly refresh of cached ExploreRoute prices:
// cheapest cash fare (Duffel) + cheapest award (Seats.aero) per origin/city, plus a country aggregate. Runs
// weekly (not nightly) and is meant to be split by continent across the week so it never exceeds the
// Seats.aero daily cap. Offline (no keys) it is a no-op — the seeded mock prices stand. Fail-soft: a failed
// award lookup keeps the previous pointsFrom rather than zeroing it.
const prisma = require("../config/database");
const env = require("../config/env");
const { logger } = require("../utils/logger");
const { searchFlights } = require("../services/duffelService");
const { searchAwardFlights } = require("../services/seatsAeroService");
const { searchHotelAwards } = require("../services/roomsAeroService");

const ORIGINS = ["LON", "MAN", "EDI", "DUB"];
// Map the city origin code to a real departure airport for the flight search.
const ORIGIN_AIRPORT = { LON: "LHR", MAN: "MAN", EDI: "EDI", DUB: "DUB" };

// refreshExplore({ continent }) — filter to one continent per day if given.
async function refreshExplore({ continent } = {}) {
  if (!env.hasDuffel) {
    logger.info("Explore refresh skipped — Duffel offline; seeded prices stand");
    return { updated: 0, skipped: true };
  }

  const countries = await prisma.exploreCountry.findMany({
    where: { isActive: true, ...(continent ? { continent } : {}) },
    include: { cities: true },
  });

  // Representative window — 3 months out, 5 nights.
  const depart = new Date();
  depart.setMonth(depart.getMonth() + 3);
  const ret = new Date(depart);
  ret.setDate(ret.getDate() + 5);
  const d = (x) => x.toISOString().split("T")[0];

  let updated = 0;

  for (const origin of ORIGINS) {
    const airport = ORIGIN_AIRPORT[origin] || "LHR";
    for (const country of countries) {
      const priced = [];

      for (const city of country.cities) {
        try {
          const flights = await searchFlights({
            origin: airport,
            destination: city.iataCode,
            departureDate: d(depart),
            returnDate: d(ret),
            adults: 1,
          });
          if (!flights?.length) continue;
          const cash = Math.round([...flights].sort((a, b) => a.totalAmount - b.totalAmount)[0].totalAmount);

          // Previous route so a skipped award lookup keeps its points rather than zeroing.
          const prev = await prisma.exploreRoute.findFirst({
            where: { originCode: origin, countryCode: country.code, cityId: city.id },
            select: { pointsFrom: true, pointsProgramme: true },
          });
          let points = prev?.pointsFrom ?? 0;
          let programme = prev?.pointsProgramme ?? "ba_avios";
          let seatsOpen = false;
          let awards = null;
          if (env.hasSeatsAero) {
            try {
              awards = await searchAwardFlights({ origin: airport, destination: city.iataCode, cabin: "economy" });
              const best = [...(awards || [])].sort((a, b) => a.pointsCost - b.pointsCost)[0];
              if (best) {
                points = best.pointsCost;
                programme = best.programme || programme;
                seatsOpen = (best.seatsAvailable ?? 0) > 0;
              }
            } catch (err) {
              logger.warn("Explore award lookup failed", { city: city.iataCode, error: err.message });
            }
          }

          await prisma.exploreRoute.upsert({
            where: { originCode_countryCode_cityId: { originCode: origin, countryCode: country.code, cityId: city.id } },
            update: { cashFrom: cash, pointsFrom: points, pointsProgramme: programme, awardSeatsOpen: seatsOpen, refreshedAt: new Date() },
            create: { originCode: origin, countryCode: country.code, cityId: city.id, cashFrom: cash, pointsFrom: points, pointsProgramme: programme, awardSeatsOpen: seatsOpen },
          });
          priced.push({ cash, points: points || Infinity, programme, seatsOpen });
          updated++;

          // §18i — flight metadata + hotels once per city (on the LON pass).
          if (origin === "LON") {
            const top = flights[0];
            await prisma.exploreCity
              .update({
                where: { id: city.id },
                data: {
                  carrier: top?.slices?.[0]?.segments?.[0]?.carrier ?? city.carrier,
                  flightMinutes: top?.slices?.[0]?.duration ?? city.flightMinutes,
                  isDirect: (top?.slices?.[0]?.segments?.length ?? 1) === 1,
                },
              })
              .catch(() => {});
            await refreshHotels(city, country, d(depart), d(ret)).catch((err) =>
              logger.warn("Explore hotel refresh failed", { city: city.iataCode, error: err.message })
            );
          }
          // §18i — six-month availability window, grouped from the award response already fetched (no extra call).
          if (awards) {
            await refreshAvailability(city, origin, awards).catch((err) =>
              logger.warn("Explore availability refresh failed", { city: city.iataCode, error: err.message })
            );
          }
        } catch (err) {
          logger.warn("Explore route refresh failed", { origin, city: city.iataCode, error: err.message });
        }
      }

      // Country aggregate (cityId: null) — cheapest across cities. findFirst (Prisma forbids null in upsert selector).
      if (priced.length) {
        const cheapest = priced.reduce((b, p) => (p.points < b.points ? p : b));
        const aggData = {
          cashFrom: Math.min(...priced.map((p) => p.cash)),
          pointsFrom: cheapest.points === Infinity ? 0 : cheapest.points,
          pointsProgramme: cheapest.programme,
          awardSeatsOpen: priced.some((p) => p.seatsOpen),
          refreshedAt: new Date(),
        };
        const existing = await prisma.exploreRoute.findFirst({
          where: { originCode: origin, countryCode: country.code, cityId: null },
          select: { id: true },
        });
        if (existing) await prisma.exploreRoute.update({ where: { id: existing.id }, data: aggData });
        else await prisma.exploreRoute.create({ data: { originCode: origin, countryCode: country.code, cityId: null, ...aggData } });
      }
    }
  }

  logger.info("Explore refresh complete", { origins: ORIGINS.length, continent: continent || "all", updated });
  return { updated };
}

// §18i — best-rated award property per programme (cheapest first) for a city.
async function refreshHotels(city, country, checkIn, checkOut) {
  const props = await searchHotelAwards({ destination: `${city.name}, ${country.name}`, checkIn, checkOut, adults: 2 });
  const byProgramme = new Map();
  for (const p of (props || []).filter((p) => p.awardAvailable)) {
    const ex = byProgramme.get(p.programme);
    if (!ex || p.pointsTotal < ex.pointsTotal) byProgramme.set(p.programme, p);
  }
  const ranked = [...byProgramme.values()].sort((a, b) => a.pointsTotal - b.pointsTotal);
  for (const [i, p] of ranked.entries()) {
    await prisma.exploreHotel.upsert({
      where: { cityId_programme: { cityId: city.id, programme: p.programme } },
      update: { propertyName: p.name, propertyCode: p.propertyCode ?? null, starRating: p.starRating ?? null, pointsTotal: p.pointsTotal, sortOrder: i, refreshedAt: new Date() },
      create: { cityId: city.id, programme: p.programme, propertyName: p.name, propertyCode: p.propertyCode ?? null, starRating: p.starRating ?? null, pointsTotal: p.pointsTotal, sortOrder: i },
    });
  }
  if (ranked[0]?.cashTotal) {
    await prisma.exploreCity.update({ where: { id: city.id }, data: { hotelCashFrom: Math.round(ranked[0].cashTotal) } });
  }
}

// §18i — write the next six months from the grouped award response; drop anything older than this month.
async function refreshAvailability(city, origin, awards) {
  const months = new Map();
  for (const a of awards) {
    const key = String(a.date || "").slice(0, 7);
    if (!key) continue;
    const m = months.get(key) ?? { seats: 0, cheapest: null, programme: null };
    m.seats += a.seatsAvailable ?? 0;
    if (m.cheapest == null || a.pointsCost < m.cheapest) {
      m.cheapest = a.pointsCost;
      m.programme = a.programme;
    }
    months.set(key, m);
  }
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const m = months.get(key) ?? { seats: 0, cheapest: null, programme: null };
    await prisma.exploreAvailability.upsert({
      where: { cityId_originCode_month: { cityId: city.id, originCode: origin, month: key } },
      update: { seatsFound: m.seats, cheapestPoints: m.cheapest, programme: m.programme, refreshedAt: new Date() },
      create: { cityId: city.id, originCode: origin, month: key, seatsFound: m.seats, cheapestPoints: m.cheapest, programme: m.programme },
    });
  }
  const cutoff = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await prisma.exploreAvailability.deleteMany({ where: { cityId: city.id, originCode: origin, month: { lt: cutoff } } });
}

module.exports = { refreshExplore };
