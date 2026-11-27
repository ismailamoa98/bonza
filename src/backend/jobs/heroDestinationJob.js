// jobs/heroDestinationJob.js — Phase 17 monthly refresh of the hero destination boards. Award-chart
// pricing is stable and this is shown to logged-out visitors, so it runs monthly (1st, 03:00 UTC), not
// nightly. Offline the roomsAeroService returns [] and every programme is skipped, leaving the seeded
// figures in place. A failed programme keeps its previous figure — stale data beats an empty board.
const prisma = require("../config/database");
const { logger } = require("../utils/logger");
const env = require("../config/env");
const { searchHotelAwards } = require("../services/roomsAeroService");
const { searchFlights, searchHotels } = require("../services/duffelService");

const PROGRAMMES = ["world_of_hyatt", "marriott_bonvoy", "hilton_honors", "ihg_one"];

async function refreshHeroDestinations() {
  const destinations = await prisma.heroDestination.findMany({ where: { isActive: true } });
  let refreshed = 0;

  for (const dest of destinations) {
    // Query a fixed window ~6 months out so pricing is representative.
    const checkIn = new Date();
    checkIn.setMonth(checkIn.getMonth() + 6);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + dest.nights);

    for (const programme of PROGRAMMES) {
      try {
        const results = await searchHotelAwards({
          destination: dest.name,
          programme,
          checkIn: checkIn.toISOString().split("T")[0],
          checkOut: checkOut.toISOString().split("T")[0],
          adults: dest.adults,
        });
        if (!results?.length) continue;

        // Best-rated property with award availability, then cheapest.
        const best = results
          .filter((r) => r.awardAvailable)
          .sort((a, b) => (b.starRating ?? 0) - (a.starRating ?? 0) || a.pointsTotal - b.pointsTotal)[0];
        if (!best) continue;

        await prisma.destinationAward.upsert({
          where: { destinationSlug_programme: { destinationSlug: dest.slug, programme } },
          update: {
            propertyName: best.name,
            propertyCode: best.propertyCode ?? null,
            pointsTotal: best.pointsTotal,
            starRating: best.starRating ?? null,
            refreshedAt: new Date(),
          },
          create: {
            destinationSlug: dest.slug,
            programme,
            propertyName: best.name,
            propertyCode: best.propertyCode ?? null,
            pointsTotal: best.pointsTotal,
            starRating: best.starRating ?? null,
          },
        });
        refreshed++;
      } catch (err) {
        logger.warn("Hero award refresh failed", { destination: dest.slug, programme, error: err.message });
      }
    }

    // Cash side (Duffel). Offline the seeded cash figures stand — same "stale beats empty" rule as awards.
    if (env.hasDuffel) {
      const checkInStr = checkIn.toISOString().split("T")[0];
      const checkOutStr = checkOut.toISOString().split("T")[0];

      // Flight — cheapest return for the destination's party size.
      try {
        const flights = await searchFlights({
          origin: dest.originCode,
          destination: dest.destCode,
          departureDate: checkInStr,
          returnDate: checkOutStr,
          adults: dest.adults,
        });
        const cheapest = [...(flights || [])].sort((a, b) => a.totalAmount - b.totalAmount)[0];
        if (cheapest) {
          await prisma.heroDestination.update({
            where: { slug: dest.slug },
            data: {
              flightCash: Math.round(cheapest.totalAmount),
              carrier: cheapest.slices?.[0]?.segments?.[0]?.carrier ?? dest.carrier,
            },
          });
        }
      } catch (err) {
        logger.warn("Hero flight refresh failed", { destination: dest.slug, error: err.message });
      }

      // Hotel cash — the searchHotels mock keys off the city, so match the award's property by name in the
      // result set (falling back to the cheapest) and price the whole stay.
      try {
        const rates = await searchHotels({
          location: dest.name,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          adults: dest.adults,
        });
        if (rates?.length) {
          for (const award of await prisma.destinationAward.findMany({ where: { destinationSlug: dest.slug } })) {
            const match = rates.find((r) => r.name === award.propertyName) || rates[0];
            if (match?.lowestRate != null) {
              await prisma.destinationAward.update({
                where: { id: award.id },
                data: { hotelCash: Math.round(match.lowestRate * dest.nights) },
              });
            }
          }
        }
      } catch (err) {
        logger.warn("Hero hotel cash refresh failed", { destination: dest.slug, error: err.message });
      }
    }

    // Re-rank ascending by points (cheapest leads).
    const awards = await prisma.destinationAward.findMany({
      where: { destinationSlug: dest.slug },
      orderBy: { pointsTotal: "asc" },
    });
    for (const [i, a] of awards.entries()) {
      await prisma.destinationAward.update({ where: { id: a.id }, data: { sortOrder: i } });
    }
    await prisma.heroDestination.update({ where: { slug: dest.slug }, data: { refreshedAt: new Date() } });
  }

  logger.info("Hero destination refresh complete", { refreshed });

  // Phase 18 — refresh the discovery rails in the same monthly run.
  await refreshExploreCountries();
  await refreshPopularTrips();

  return { refreshed };
}

const iso = (d) => new Date(d).toISOString().split("T")[0];

// Country entry points (Seats.aero). Offline the seeded fromPoints stand — no live lookup service is wired
// yet, so this is a fail-soft placeholder mirroring the hero job's award refresh.
async function refreshExploreCountries() {
  if (!env.hasSeatsAero) return;
  const countries = await prisma.exploreCountry.findMany({ where: { isActive: true } });
  for (const c of countries) {
    try {
      // findCheapestAwardEntry(c.code) — Seats.aero lookup, to be wired at cutover. No-op until then.
      await prisma.exploreCountry.update({ where: { id: c.id }, data: { refreshedAt: new Date() } });
    } catch (err) {
      logger.warn("Country refresh failed", { country: c.code, error: err.message });
    }
  }
}

// Popular trips — refresh cash totals (Duffel) and roll depart dates forward so no card shows a past date.
async function refreshPopularTrips() {
  const trips = await prisma.popularTrip.findMany({ where: { isActive: true } });
  for (const t of trips) {
    try {
      // Roll a past departure ~6 months out (return keeps the same nights window).
      let departDate = t.departDate;
      let returnDate = t.returnDate;
      if (new Date(departDate) < new Date()) {
        departDate = new Date();
        departDate.setDate(departDate.getDate() + 180);
        returnDate = new Date(departDate);
        returnDate.setDate(returnDate.getDate() + t.nights);
      }

      let cashPatch = {};
      if (env.hasDuffel) {
        const [flights, hotels] = await Promise.all([
          searchFlights({
            origin: t.originCode,
            destination: t.destCode,
            departureDate: iso(departDate),
            returnDate: iso(returnDate),
            adults: t.adults,
          }),
          searchHotels({
            location: t.destCity,
            checkIn: iso(departDate),
            checkOut: iso(returnDate),
            adults: t.adults,
          }),
        ]);
        const flightCash = Math.round(flights?.[0]?.totalAmount ?? 0);
        const hotelCash = Math.round((hotels?.[0]?.lowestRate ?? 0) * t.nights);
        if (flightCash && hotelCash) cashPatch = { cashTotal: flightCash + hotelCash };
      }

      await prisma.popularTrip.update({
        where: { id: t.id },
        data: { ...cashPatch, departDate, returnDate, refreshedAt: new Date() },
      });
    } catch (err) {
      logger.warn("Trip refresh failed", { trip: t.id, error: err.message });
    }
  }
}

module.exports = { refreshHeroDestinations, refreshExploreCountries, refreshPopularTrips };
