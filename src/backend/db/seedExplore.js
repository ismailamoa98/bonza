// db/seedExplore.js — Phase 18 (Explore Everywhere). Migrates the 60-country browse set into DB-backed
// ExploreCountry + ExploreCity, and seeds mock ExploreRoute prices per origin so the /explore map shows
// £/points offline (the weekly exploreRefreshJob overwrites with live Duffel/Seats.aero fares in prod).
// ⚠️ All of these prices are MOCK — audit + replace before go-live. Country/city structure comes from
// db/worldDirectory.js; centroids/images/fromPoints below.
const prisma = require("../config/database");
const { REGIONS } = require("./worldDirectory");

// Country centroids (approx) for the map pins, keyed by ISO-2.
const CENTROID = {
  gb: [54.0, -2.0], fr: [46.6, 2.4], es: [40.4, -3.7], it: [41.9, 12.6], pt: [39.5, -8.0],
  gr: [39.0, 22.0], nl: [52.2, 5.3], de: [51.2, 10.4], ch: [46.8, 8.2], at: [47.6, 14.1],
  ie: [53.4, -8.0], be: [50.6, 4.6], cz: [49.8, 15.5], hr: [45.1, 15.2], is: [64.9, -19.0],
  no: [64.5, 12.0], se: [62.0, 15.0], dk: [56.0, 9.5],
  ae: [24.0, 54.0], qa: [25.3, 51.2], tr: [39.0, 35.2], il: [31.4, 35.0], jo: [31.2, 36.5], om: [21.0, 57.0],
  za: [-30.6, 22.9], eg: [26.8, 30.8], ma: [31.8, -7.1], ke: [0.2, 37.9], tz: [-6.4, 34.9], mu: [-20.3, 57.5],
  sc: [-4.7, 55.5], ng: [9.1, 8.7],
  jp: [36.2, 138.3], th: [15.9, 100.9], id: [-2.5, 118.0], sg: [1.35, 103.8], vn: [14.1, 108.3],
  my: [4.2, 101.9], ph: [12.9, 121.8], in: [22.0, 79.0], lk: [7.9, 80.8], mv: [3.2, 73.2], cn: [35.9, 104.2],
  hk: [22.3, 114.2], kr: [36.5, 127.9],
  us: [39.8, -98.6], ca: [56.1, -106.3], mx: [23.6, -102.6], br: [-14.2, -51.9], ar: [-38.4, -63.6],
  pe: [-9.2, -75.0], cl: [-35.7, -71.5], co: [4.6, -74.3], cr: [9.7, -83.8], jm: [18.1, -77.3],
  cu: [21.5, -79.5], bb: [13.2, -59.5],
  au: [-25.3, 133.8], nz: [-41.0, 174.0], fj: [-17.7, 178.0],
};

// The 8 discovery countries keep their rail "from X pts" + lead sortOrder so /discover's take:8 still yields them.
const DISCOVERY = {
  es: { fromPoints: 26000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 1 },
  it: { fromPoints: 30000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 2 },
  jp: { fromPoints: 100000, fromCurrency: "pts", fromProgramme: "world_of_hyatt", sortOrder: 3 },
  gr: { fromPoints: 35000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 4 },
  id: { fromPoints: 120000, fromCurrency: "pts", fromProgramme: "world_of_hyatt", sortOrder: 5 },
  pt: { fromPoints: 18000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 6 },
  za: { fromPoints: 90000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 7 },
  mv: { fromPoints: 100000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 8 },
};

// Country hero images (the 8 discovery photos); everything else falls back to its gradient.
const COUNTRY_IMG = { es: "/explore/es.jpg", it: "/explore/it.jpg", jp: "/explore/jp.jpg", gr: "/explore/gr.jpg", id: "/explore/id.jpg", pt: "/explore/pt.jpg", za: "/explore/za.jpg", mv: "/explore/mv.jpg" };

// City photos we already have (fetched cities + reused hero/trip images); others show a gradient.
const CITY_IMG = {
  BCN: "/cities/BCN.jpg", MAD: "/cities/MAD.jpg", SVQ: "/cities/SVQ.jpg", PMI: "/cities/PMI.jpg",
  FCO: "/cities/FCO.jpg", VCE: "/cities/VCE.jpg", FLR: "/cities/FLR.jpg", HND: "/cities/HND.jpg",
  ATH: "/cities/ATH.jpg", JMK: "/cities/JMK.jpg", CGK: "/cities/CGK.jpg", FAO: "/cities/FAO.jpg",
  JNB: "/cities/JNB.jpg", NAP: "/auth/amalfi.jpg", KIX: "/auth/kyoto.jpg", CPT: "/auth/capetown.jpg",
  DPS: "/auth/bali.jpg", JTR: "/auth/santorini.jpg", MLE: "/auth/maldives.jpg", LIS: "/trips/lisbon.jpg",
  OPO: "/explore/pt.jpg",
};

// Mock price tiers by region (£ return + Avios award). Region base cash comes from worldDirectory.
const POINTS_BASE = { Europe: 15000, "Middle East": 30000, Africa: 55000, Asia: 60000, Americas: 45000, Oceania: 75000 };
const ORIGINS = ["LON", "MAN", "EDI", "DUB"];
const ORIGIN_ADJ = { LON: 0, MAN: -20, EDI: -10, DUB: 15 }; // small £ variance per origin

const hash = (s) => [...s].reduce((a, ch) => a + ch.charCodeAt(0), 0);

// Mock holiday type + hotel cost per city. Beach = island/coastal resort codes; else by region.
const BEACH = new Set(["DPS", "MLE", "JTR", "JMK", "HKT", "PMI", "AGP", "FAO", "CUN", "MBJ", "BGI", "HAV", "NAN", "MRU", "SEZ", "ZNZ", "HRG", "CPT"]);
const HOTEL_BASE = { Europe: 700, "Middle East": 1200, Africa: 1400, Asia: 900, Americas: 1100, Oceania: 1600 };
function holidayType(iata, region) {
  if (BEACH.has(iata)) return "Beach";
  if (region === "Europe") return "City break";
  if (region === "Africa" || region === "Oceania") return "Adventure";
  return "Culture";
}

// §18i mock flight metadata + hotels + availability.
const CARRIER = { Europe: "British Airways", "Middle East": "Emirates", Africa: "Kenya Airways", Asia: "Singapore Airlines", Americas: "Virgin Atlantic", Oceania: "Qantas" };
const DURATION = { Europe: 120, "Middle East": 400, Africa: 660, Asia: 720, Americas: 480, Oceania: 1380 };
// Named award chains (real chain + city name). Ascending points → cheapest first.
const HOTEL_CHAINS = [
  { programme: "world_of_hyatt", name: (c) => `Park Hyatt ${c}`, star: 5, base: 90000 },
  { programme: "marriott_bonvoy", name: (c) => `${c} Marriott`, star: 4, base: 130000 },
  { programme: "hilton_honors", name: (c) => `Hilton ${c}`, star: 4, base: 170000 },
];
// Cities (by IATA) with NO hotels bookable on points — a cash hotel still exists, but no award property. Mock,
// chosen so the country page's "Hotels on points" filter visibly narrows (leisure/secondary spots where major
// award chains are genuinely thin). Real award-hotel coverage comes from rooms.aero at go-live.
const NO_AWARD_HOTELS = new Set(["HKT", "JTR", "AGP", "FAO", "HRG", "ZNZ", "NAN", "BGI", "MLE", "SEZ", "GOI"]);
function monthKey(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function seedExplore() {
  let countryN = 0;
  let cityN = 0;
  let routeN = 0;
  const hotelRows = [];
  const availRows = [];

  for (const r of REGIONS) {
    const pointsBase = POINTS_BASE[r.region] || 40000;

    for (const c of r.countries) {
      const [lat, lon] = CENTROID[c.code] || [0, 0];
      const disc = DISCOVERY[c.code] || {};
      await prisma.exploreCountry.upsert({
        where: { code: c.code },
        update: {
          name: c.name, continent: r.region, latitude: lat, longitude: lon,
          imageUrl: COUNTRY_IMG[c.code] || null, gradient: r.gradient,
          sortOrder: disc.sortOrder ?? 100, isActive: true,
          fromPoints: disc.fromPoints ?? null, fromCurrency: disc.fromCurrency ?? null,
          fromProgramme: disc.fromProgramme ?? null,
        },
        create: {
          code: c.code, name: c.name, continent: r.region, latitude: lat, longitude: lon,
          imageUrl: COUNTRY_IMG[c.code] || null, gradient: r.gradient,
          sortOrder: disc.sortOrder ?? 100,
          fromPoints: disc.fromPoints ?? null, fromCurrency: disc.fromCurrency ?? null,
          fromProgramme: disc.fromProgramme ?? null,
        },
      });
      countryN++;

      const cityRows = [];
      for (const [i, city] of c.cities.entries()) {
        const cityFields = {
          name: city.name,
          imageUrl: CITY_IMG[city.code] || null,
          hotelsOnPoints: NO_AWARD_HOTELS.has(city.code) ? 0 : HOTEL_CHAINS.length,
          holidayType: holidayType(city.code, r.region),
          hotelCashFrom: (HOTEL_BASE[r.region] || 900) + (hash(city.code) % 6) * 120,
          hotelPointsFrom: 90000,
          hotelProgramme: "world_of_hyatt",
          carrier: CARRIER[r.region] || "British Airways",
          flightMinutes: (DURATION[r.region] || 300) + (hash(city.code) % 5) * 15,
          isDirect: r.region === "Europe" || r.region === "Middle East" || hash(city.code) % 2 === 0,
        };
        const row = await prisma.exploreCity.upsert({
          where: { countryCode_iataCode: { countryCode: c.code, iataCode: city.code } },
          update: cityFields,
          create: { countryCode: c.code, iataCode: city.code, ...cityFields },
        });
        cityRows.push({ id: row.id, code: city.code, i });
        cityN++;

        // Named hotels on points (cheapest first) — skipped for cities with no award-hotel coverage.
        if (!NO_AWARD_HOTELS.has(city.code)) HOTEL_CHAINS.forEach((h, hi) => {
          hotelRows.push({
            cityId: row.id,
            programme: h.programme,
            propertyName: h.name(city.name),
            starRating: h.star,
            pointsTotal: h.base + (hash(city.code) % 5) * 5000,
            sortOrder: hi,
          });
        });

        // Six rolling months × 4 origins of mock award availability (some months closed).
        for (const origin of ORIGINS) {
          for (let mi = 0; mi < 6; mi++) {
            const seats = [0, 6, 12, 3, 8, 0][(hash(city.code + origin) + mi) % 6];
            availRows.push({
              cityId: row.id,
              originCode: origin,
              month: monthKey(mi),
              seatsFound: seats,
              cheapestPoints: seats ? 15000 + (hash(city.code) % 6) * 3000 : null,
              programme: seats ? "ba_avios" : null,
            });
          }
        }
      }

      // Mock ExploreRoute prices — per origin, per city + a country aggregate (min across cities).
      for (const origin of ORIGINS) {
        const adj = ORIGIN_ADJ[origin] || 0;
        const priced = [];
        for (const cr of cityRows) {
          const cashFrom = Math.max(59, r.baseCash + adj + (hash(cr.code + origin) % 7) * 55 - 120);
          const pointsFrom = pointsBase + (hash(cr.code) % 6) * 3000;
          const seatsOpen = hash(cr.code + origin) % 3 === 0;
          await prisma.exploreRoute.upsert({
            where: { originCode_countryCode_cityId: { originCode: origin, countryCode: c.code, cityId: cr.id } },
            update: { cashFrom, pointsFrom, pointsProgramme: "ba_avios", awardSeatsOpen: seatsOpen, refreshedAt: new Date() },
            create: { originCode: origin, countryCode: c.code, cityId: cr.id, cashFrom, pointsFrom, pointsProgramme: "ba_avios", awardSeatsOpen: seatsOpen },
          });
          routeN++;
          priced.push({ cashFrom, pointsFrom, seatsOpen });
        }
        // Country aggregate row (cityId: null) — cheapest across cities. Prisma forbids null in a compound
        // -unique upsert selector, so find-then-write by hand.
        if (priced.length) {
          const aggData = {
            cashFrom: Math.min(...priced.map((p) => p.cashFrom)),
            pointsFrom: Math.min(...priced.map((p) => p.pointsFrom)),
            pointsProgramme: "ba_avios",
            awardSeatsOpen: priced.some((p) => p.seatsOpen),
            refreshedAt: new Date(),
          };
          const existing = await prisma.exploreRoute.findFirst({
            where: { originCode: origin, countryCode: c.code, cityId: null },
            select: { id: true },
          });
          if (existing) await prisma.exploreRoute.update({ where: { id: existing.id }, data: aggData });
          else await prisma.exploreRoute.create({ data: { originCode: origin, countryCode: c.code, cityId: null, ...aggData } });
          routeN++;
        }
      }
    }
  }

  // Hotels + availability — reset and bulk-insert (too many rows for per-row upserts).
  await prisma.exploreHotel.deleteMany({});
  await prisma.exploreAvailability.deleteMany({});
  for (let i = 0; i < hotelRows.length; i += 500) await prisma.exploreHotel.createMany({ data: hotelRows.slice(i, i + 500) });
  for (let i = 0; i < availRows.length; i += 500) await prisma.exploreAvailability.createMany({ data: availRows.slice(i, i + 500) });

  console.log(
    `Seeded ${countryN} explore countries, ${cityN} cities, ${routeN} routes, ${hotelRows.length} hotels, ${availRows.length} availability rows (mock)`
  );
}

module.exports = { seedExplore };
