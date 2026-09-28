// db/seedDiscovery.js — Phase 18 homepage discovery rails. Eight countries + origin-aware popular trips
// (LHR and a shorter MAN mirror so origin resolution is testable). Cash figures are whole-pound totals;
// points figures are whole-trip. Depart dates seed ~6 months out and roll forward on each monthly refresh.
// Refreshed monthly by jobs/heroDestinationJob.js. Plausible starting points, not live data.
const prisma = require("../config/database");

const COUNTRIES = [
  { code: "es", name: "Spain", imageUrl: "/explore/es.jpg", gradient: "linear-gradient(160deg,#E8B489,#8A6A45)", fromPoints: 26000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 1 },
  { code: "it", name: "Italy", imageUrl: "/explore/it.jpg", gradient: "linear-gradient(160deg,#7FB3D0,#C98A5A)", fromPoints: 30000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 2 },
  { code: "jp", name: "Japan", imageUrl: "/explore/jp.jpg", gradient: "linear-gradient(160deg,#C9705C,#4E4238)", fromPoints: 100000, fromCurrency: "pts", fromProgramme: "world_of_hyatt", sortOrder: 3 },
  { code: "gr", name: "Greece", imageUrl: "/explore/gr.jpg", gradient: "linear-gradient(160deg,#9CC8E0,#3D5A80)", fromPoints: 35000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 4 },
  { code: "id", name: "Indonesia", imageUrl: "/explore/id.jpg", gradient: "linear-gradient(160deg,#8FC49A,#2F5648)", fromPoints: 120000, fromCurrency: "pts", fromProgramme: "world_of_hyatt", sortOrder: 5 },
  { code: "pt", name: "Portugal", imageUrl: "/explore/pt.jpg", gradient: "linear-gradient(160deg,#F0B89C,#8A5A45)", fromPoints: 18000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 6 },
  { code: "za", name: "South Africa", imageUrl: "/explore/za.jpg", gradient: "linear-gradient(160deg,#E8B489,#3F5A66)", fromPoints: 90000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 7 },
  { code: "mv", name: "Maldives", imageUrl: "/explore/mv.jpg", gradient: "linear-gradient(160deg,#79BECD,#265F7C)", fromPoints: 100000, fromCurrency: "Avios", fromProgramme: "ba_avios", sortOrder: 8 },
];

// Trips reuse the strong hero photos where the destination matches; Lisbon gets its own new photo.
const TRIPS = [
  // ── London (LHR) ──────────────────────────────────────────────────────────────
  { originCode: "LHR", originCity: "London", destCode: "LIS", destCity: "Lisbon", routeLabel: "London to Lisbon", imageUrl: "/trips/lisbon.jpg", gradient: "linear-gradient(160deg,#F0B89C,#8A5A45)", nights: 4, cashTotal: 740, flightPoints: 18000, flightCurrency: "Avios", hotelPoints: 80000, hotelProgramme: "world_of_hyatt", awardAvailable: true, sortOrder: 1 },
  { originCode: "LHR", originCity: "London", destCode: "KIX", destCity: "Kyoto", routeLabel: "London to Kyoto", imageUrl: "/auth/kyoto.jpg", gradient: "linear-gradient(160deg,#C9705C,#4E4238)", nights: 6, cashTotal: 2480, hotelPoints: 100000, hotelProgramme: "world_of_hyatt", residualCash: 640, awardAvailable: false, sortOrder: 2 },
  { originCode: "LHR", originCity: "London", destCode: "CPT", destCity: "Cape Town", routeLabel: "London to Cape Town", imageUrl: "/auth/capetown.jpg", gradient: "linear-gradient(160deg,#E8B489,#3F5A66)", nights: 7, cashTotal: 2660, hotelPoints: 140000, hotelProgramme: "world_of_hyatt", residualCash: 560, awardAvailable: true, sortOrder: 3 },
  { originCode: "LHR", originCity: "London", destCode: "NAP", destCity: "Naples", routeLabel: "London to Amalfi", imageUrl: "/auth/amalfi.jpg", gradient: "linear-gradient(160deg,#E8A87C,#5B7C8D)", nights: 6, cashTotal: 1860, hotelPoints: 125000, hotelProgramme: "world_of_hyatt", residualCash: 180, awardAvailable: false, sortOrder: 4 },
  { originCode: "LHR", originCity: "London", destCode: "DPS", destCity: "Bali", routeLabel: "London to Bali", imageUrl: "/auth/bali.jpg", gradient: "linear-gradient(160deg,#8FC49A,#2F5648)", nights: 10, cashTotal: 2240, hotelPoints: 120000, hotelProgramme: "world_of_hyatt", residualCash: 820, awardAvailable: true, sortOrder: 5 },

  // ── Manchester (MAN) — shorter mirror, own routeLabels + cash ────────────────────
  { originCode: "MAN", originCity: "Manchester", destCode: "LIS", destCity: "Lisbon", routeLabel: "Manchester to Lisbon", imageUrl: "/trips/lisbon.jpg", gradient: "linear-gradient(160deg,#F0B89C,#8A5A45)", nights: 4, cashTotal: 700, flightPoints: 18000, flightCurrency: "Avios", hotelPoints: 80000, hotelProgramme: "world_of_hyatt", awardAvailable: true, sortOrder: 1 },
  { originCode: "MAN", originCity: "Manchester", destCode: "NAP", destCity: "Naples", routeLabel: "Manchester to Amalfi", imageUrl: "/auth/amalfi.jpg", gradient: "linear-gradient(160deg,#E8A87C,#5B7C8D)", nights: 6, cashTotal: 1820, hotelPoints: 125000, hotelProgramme: "world_of_hyatt", residualCash: 200, awardAvailable: false, sortOrder: 2 },
  { originCode: "MAN", originCity: "Manchester", destCode: "DPS", destCity: "Bali", routeLabel: "Manchester to Bali", imageUrl: "/auth/bali.jpg", gradient: "linear-gradient(160deg,#8FC49A,#2F5648)", nights: 10, cashTotal: 2180, hotelPoints: 120000, hotelProgramme: "world_of_hyatt", residualCash: 860, awardAvailable: true, sortOrder: 3 },
];

// Depart ~6 months out, staggered a little per trip so the rail isn't all one date; return = depart + nights.
function tripDates(offsetDays, nights) {
  const depart = new Date();
  depart.setDate(depart.getDate() + 180 + offsetDays);
  const returnDate = new Date(depart);
  returnDate.setDate(returnDate.getDate() + nights);
  return { departDate: depart, returnDate };
}

async function seedDiscovery() {
  // ExploreCountry is now owned by seedExplore (60 countries + centroids); this seeds only PopularTrip.
  for (const [i, t] of TRIPS.entries()) {
    const { departDate, returnDate } = tripDates(i * 9, t.nights);
    const data = { ...t, departDate, returnDate };
    await prisma.popularTrip.upsert({
      where: { originCode_destCode: { originCode: t.originCode, destCode: t.destCode } },
      update: data,
      create: data,
    });
  }

  console.log(`Seeded ${TRIPS.length} popular trips`);
}

module.exports = { seedDiscovery, COUNTRIES, TRIPS };
