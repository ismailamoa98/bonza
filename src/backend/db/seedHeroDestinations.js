// db/seedHeroDestinations.js — Phase 17 hero destination board reference data. Eight destinations, each a
// distinct kind of trip (honeymoon, family, long-haul, city break — varied nights/adults/month). Each card
// shows the whole trip two ways: all cash (return flight + whole-stay hotel), and points + cash (hotel on
// points, flight still in cash). Seeded once; refreshed monthly by jobs/heroDestinationJob.js. Cash and
// points figures are plausible starting points that a Duffel (cash) + Rooms.aero (points) pull replaces
// later, not live data. All figures are whole-trip totals for `adults` / `nights` — the frontend only adds.
const prisma = require("../config/database");

const DESTINATIONS = [
  {
    slug: "amalfi", name: "Amalfi Coast, Italy", tagline: "Amalfi Spring Escape", imageUrl: "/auth/amalfi.jpg",
    gradient: "linear-gradient(160deg,#E8A87C,#5B7C8D)", nights: 6, adults: 2, travelMonth: "May 2026", sortOrder: 1,
    originCode: "LHR", destCode: "NAP", routeLabel: "London → Naples", carrier: "British Airways", flightCash: 180,
    awards: [
      { programme: "world_of_hyatt", propertyName: "Borgo Santandrea", pointsTotal: 125000, hotelCash: 2940, starRating: 5 },
      { programme: "marriott_bonvoy", propertyName: "Hotel Villa Franca Positano", pointsTotal: 200000, hotelCash: 2160, starRating: 5 },
      { programme: "ihg_one", propertyName: "Hotel Marina Riviera", pointsTotal: 280000, hotelCash: 1560, starRating: 4 },
    ],
  },
  {
    slug: "maldives", name: "Maldives", tagline: "Maldives Winter Sun", imageUrl: "/auth/maldives.jpg",
    gradient: "linear-gradient(160deg,#7EC8D8,#2A6B8A)", nights: 7, adults: 2, travelMonth: "February 2026", sortOrder: 2,
    originCode: "LHR", destCode: "MLE", routeLabel: "London → Malé", carrier: "Qatar Airways", flightCash: 710,
    awards: [
      { programme: "world_of_hyatt", propertyName: "Park Hyatt Maldives Hadahaa", pointsTotal: 150000, hotelCash: 5600, starRating: 5 },
      { programme: "marriott_bonvoy", propertyName: "The St. Regis Maldives", pointsTotal: 425000, hotelCash: 9100, starRating: 5 },
      { programme: "hilton_honors", propertyName: "Conrad Maldives Rangali Island", pointsTotal: 480000, hotelCash: 8400, starRating: 5 },
    ],
  },
  {
    slug: "santorini", name: "Santorini, Greece", tagline: "Santorini Summer Sunsets", imageUrl: "/auth/santorini.jpg",
    gradient: "linear-gradient(160deg,#F0B89C,#3D5A80)", nights: 4, adults: 2, travelMonth: "June 2026", sortOrder: 3,
    originCode: "LHR", destCode: "JTR", routeLabel: "London → Santorini", carrier: "British Airways", flightCash: 240,
    awards: [
      { programme: "world_of_hyatt", propertyName: "Istoria, a Member of Design Hotels", pointsTotal: 85000, hotelCash: 1680, starRating: 5 },
      { programme: "marriott_bonvoy", propertyName: "Santo Maris Oia", pointsTotal: 150000, hotelCash: 1320, starRating: 5 },
      { programme: "hilton_honors", propertyName: "Canaves Oia Hotel", pointsTotal: 320000, hotelCash: 2600, starRating: 5 },
    ],
  },
  {
    slug: "dubai", name: "Dubai, UAE", tagline: "Dubai Autumn City Break", imageUrl: "/auth/dubai.jpg",
    gradient: "linear-gradient(160deg,#E3B778,#3A5A78)", nights: 5, adults: 4, travelMonth: "November 2026", sortOrder: 4,
    originCode: "LHR", destCode: "DXB", routeLabel: "London → Dubai", carrier: "Emirates", flightCash: 1200,
    awards: [
      { programme: "world_of_hyatt", propertyName: "Park Hyatt Dubai", pointsTotal: 100000, hotelCash: 2250, starRating: 5 },
      { programme: "marriott_bonvoy", propertyName: "The St. Regis Downtown Dubai", pointsTotal: 200000, hotelCash: 2600, starRating: 5 },
      { programme: "hilton_honors", propertyName: "Conrad Dubai", pointsTotal: 380000, hotelCash: 3400, starRating: 5 },
    ],
  },
  {
    slug: "bali", name: "Bali, Indonesia", tagline: "Bali Summer Getaway", imageUrl: "/auth/bali.jpg",
    gradient: "linear-gradient(160deg,#7FB88A,#2E6B5E)", nights: 10, adults: 2, travelMonth: "August 2026", sortOrder: 5,
    originCode: "LHR", destCode: "DPS", routeLabel: "London → Denpasar", carrier: "Qatar Airways", flightCash: 820,
    awards: [
      { programme: "world_of_hyatt", propertyName: "Andaz Bali", pointsTotal: 120000, hotelCash: 1420, starRating: 5 },
      { programme: "hilton_honors", propertyName: "Conrad Bali", pointsTotal: 320000, hotelCash: 1680, starRating: 5 },
      { programme: "marriott_bonvoy", propertyName: "The St. Regis Bali Resort", pointsTotal: 400000, hotelCash: 2240, starRating: 5 },
    ],
  },
  {
    slug: "capetown", name: "Cape Town, South Africa", tagline: "Cape Town Autumn Escape", imageUrl: "/auth/capetown.jpg",
    gradient: "linear-gradient(160deg,#F2C094,#4A6572)", nights: 7, adults: 2, travelMonth: "March 2026", sortOrder: 6,
    originCode: "LHR", destCode: "CPT", routeLabel: "London → Cape Town", carrier: "British Airways", flightCash: 560,
    awards: [
      { programme: "world_of_hyatt", propertyName: "The Silo Hotel", pointsTotal: 140000, hotelCash: 4200, starRating: 5 },
      { programme: "marriott_bonvoy", propertyName: "Westin Cape Town", pointsTotal: 175000, hotelCash: 1540, starRating: 5 },
      { programme: "hilton_honors", propertyName: "Hilton Cape Town City Centre", pointsTotal: 340000, hotelCash: 1190, starRating: 4 },
    ],
  },
  {
    slug: "kyoto", name: "Kyoto, Japan", tagline: "Kyoto Autumn Leaves", imageUrl: "/auth/kyoto.jpg",
    gradient: "linear-gradient(160deg,#D4735E,#5A4A3F)", nights: 6, adults: 2, travelMonth: "October 2026", sortOrder: 7,
    originCode: "LHR", destCode: "KIX", routeLabel: "London → Osaka", carrier: "British Airways", flightCash: 640,
    awards: [
      { programme: "world_of_hyatt", propertyName: "Park Hyatt Kyoto", pointsTotal: 100000, hotelCash: 3300, starRating: 5 },
      { programme: "marriott_bonvoy", propertyName: "The Ritz-Carlton Kyoto", pointsTotal: 175000, hotelCash: 3900, starRating: 5 },
      { programme: "hilton_honors", propertyName: "Hilton Kyoto", pointsTotal: 480000, hotelCash: 1320, starRating: 4 },
    ],
  },
  {
    slug: "banff", name: "Banff, Canada", tagline: "Banff Winter Wonderland", imageUrl: "/auth/banff.jpg",
    gradient: "linear-gradient(160deg,#8FC4D4,#3B5A52)", nights: 5, adults: 4, travelMonth: "January 2026", sortOrder: 8,
    originCode: "LHR", destCode: "YYC", routeLabel: "London → Calgary", carrier: "Air Canada", flightCash: 2080,
    awards: [
      { programme: "world_of_hyatt", propertyName: "Rimrock Resort Hotel", pointsTotal: 110000, hotelCash: 1800, starRating: 4 },
      { programme: "marriott_bonvoy", propertyName: "Fairmont Banff Springs", pointsTotal: 200000, hotelCash: 2600, starRating: 5 },
      { programme: "hilton_honors", propertyName: "Hilton Canmore", pointsTotal: 260000, hotelCash: 1500, starRating: 4 },
    ],
  },
];

async function seedHeroDestinations() {
  for (const d of DESTINATIONS) {
    const { awards, ...dest } = d;

    await prisma.heroDestination.upsert({ where: { slug: d.slug }, update: dest, create: dest });

    // Cheapest programme leads — sort ascending by points.
    const sorted = [...awards].sort((a, b) => a.pointsTotal - b.pointsTotal);
    for (const [i, a] of sorted.entries()) {
      await prisma.destinationAward.upsert({
        where: { destinationSlug_programme: { destinationSlug: d.slug, programme: a.programme } },
        update: { ...a, sortOrder: i, refreshedAt: new Date() },
        create: { ...a, destinationSlug: d.slug, sortOrder: i },
      });
    }
  }
  console.log(`Seeded ${DESTINATIONS.length} hero destinations`);
}

module.exports = { seedHeroDestinations, DESTINATIONS };
