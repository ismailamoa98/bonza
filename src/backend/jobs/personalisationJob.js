// jobs/personalisationJob.js — nightly job building PersonalisedRecommendation cards per user.
const prisma = require("../config/database");
const env = require("../config/env");
const { searchAwardFlights } = require("../services/seatsAeroService");
const { logger } = require("../utils/logger");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { isProActive } = require("../middleware/requirePro");
const { PROGRAMME_VALUATIONS } = require("../services/emailLoyaltySync");
const { CASHBACK_RATE, CLAUDE_MODEL } = require("../config/constants");
const {
  triggerAwardAlert,
  triggerExpiryWarning,
  triggerPriceDrop,
} = require("../services/notificationTriggers");

const DAY_MS = 24 * 60 * 60 * 1000;

const REFRESH_TIERS = {
  active_pro: { maxAgeDays: 2, destinations: 3 },
  pro: { maxAgeDays: 5, destinations: 3 },
  free_active: { maxAgeDays: 10, destinations: 2 },
  dormant: null,
};

const DESTINATION_CATALOG = {
  LIS: { city: "Lisbon", country: "Portugal", query: "lisbon,portugal", grad: "linear-gradient(135deg,#F2B07A,#D9763F)" },
  LISBON: { city: "Lisbon", country: "Portugal", query: "lisbon,portugal", grad: "linear-gradient(135deg,#F2B07A,#D9763F)" },
  BCN: { city: "Barcelona", country: "Spain", query: "barcelona,spain", grad: "linear-gradient(135deg,#E8956B,#C25E36)" },
  BARCELONA: { city: "Barcelona", country: "Spain", query: "barcelona,spain", grad: "linear-gradient(135deg,#E8956B,#C25E36)" },
  NCE: { city: "Nice", country: "France", query: "nice,france", grad: "linear-gradient(135deg,#6FB7D4,#3D7EA6)" },
  NICE: { city: "Nice", country: "France", query: "nice,france", grad: "linear-gradient(135deg,#6FB7D4,#3D7EA6)" },
  FCO: { city: "Rome", country: "Italy", query: "rome,italy", grad: "linear-gradient(135deg,#D8A15E,#B06B2E)" },
  ROME: { city: "Rome", country: "Italy", query: "rome,italy", grad: "linear-gradient(135deg,#D8A15E,#B06B2E)" },
  HND: { city: "Tokyo", country: "Japan", query: "tokyo,japan", grad: "linear-gradient(135deg,#E2738F,#B23A66)" },
  NRT: { city: "Tokyo", country: "Japan", query: "tokyo,japan", grad: "linear-gradient(135deg,#E2738F,#B23A66)" },
  TOKYO: { city: "Tokyo", country: "Japan", query: "tokyo,japan", grad: "linear-gradient(135deg,#E2738F,#B23A66)" },
  DXB: { city: "Dubai", country: "UAE", query: "dubai", grad: "linear-gradient(135deg,#E8B96B,#C98A2E)" },
  DUBAI: { city: "Dubai", country: "UAE", query: "dubai", grad: "linear-gradient(135deg,#E8B96B,#C98A2E)" },
  JFK: { city: "New York", country: "USA", query: "new-york,city", grad: "linear-gradient(135deg,#8A9BD4,#4A5BA6)" },
  CDG: { city: "Paris", country: "France", query: "paris,france", grad: "linear-gradient(135deg,#C8A2C8,#8E5A8E)" },
  PARIS: { city: "Paris", country: "France", query: "paris,france", grad: "linear-gradient(135deg,#C8A2C8,#8E5A8E)" },
};
const DEFAULT_TARGETS = ["LIS", "BCN", "NCE"];

function catalogFor(destination) {
  const key = String(destination || "").trim().toUpperCase();
  return (
    DESTINATION_CATALOG[key] || {
      city: String(destination || "Somewhere new").trim(),
      country: "",
      query: `${String(destination || "travel").trim().toLowerCase()}`,
      grad: "linear-gradient(135deg,#E8956B,#C25E36)",
    }
  );
}

const AWARD_PROGRAMME_INFO = {
  aeroplan: { name: "Aeroplan", benchmarkCpp: 1.3 },
  united: { name: "United MileagePlus", benchmarkCpp: 1.2 },
  ba_avios: { name: "BA Avios", benchmarkCpp: 1.1 },
};
const awardProgrammeName = (p) => AWARD_PROGRAMME_INFO[p]?.name || p;

const round2 = (n) => Math.round(n * 100) / 100;

function ratingFromCpp(cpp, benchmark) {
  if (cpp >= benchmark * 1.25) return "excellent";
  if (cpp >= benchmark) return "good";
  if (cpp >= benchmark * 0.7) return "typical";
  return "below_average";
}

async function getUserRefreshTier(userId) {
  const [user, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { lastLoginAt: true } }),
    prisma.subscription.findUnique({ where: { userId } }),
  ]);

  const daysSinceLogin = user?.lastLoginAt
    ? (Date.now() - user.lastLoginAt.getTime()) / DAY_MS
    : 999;

  const isPro = isProActive(subscription);
  if (daysSinceLogin > 30) return "dormant";
  if (isPro && daysSinceLogin <= 7) return "active_pro";
  if (isPro) return "pro";
  return "free_active";
}

async function generateDestinationTargets(userId, maxDestinations) {
  const events = await prisma.userEvent.findMany({
    where: {
      userId,
      type: EVENT_TYPES.AWARD_SEARCH_RUN,
      createdAt: { gt: new Date(Date.now() - 90 * DAY_MS) },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const freq = {};
  for (const e of events) {
    const dest = e.metadata?.destination;
    if (dest) freq[dest] = (freq[dest] || 0) + 1;
  }
  let targets = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([dest]) => dest);

  if (targets.length < maxDestinations) {
    const trips = await prisma.trip.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { destination: true },
    });
    for (const t of trips) {
      if (t.destination && !targets.includes(t.destination)) targets.push(t.destination);
    }
  }
  if (!targets.length) targets = [...DEFAULT_TARGETS];

  return targets.slice(0, maxDestinations);
}

function estimateCashGbp(destination) {
  const s = String(destination || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
  return 480 + h; // £480–£1,480
}

function buildMockRecommendation({ destination, origin, awards, loyaltyAccounts }) {
  const cat = catalogFor(destination);
  const cashGbp = estimateCashGbp(destination);
  const wasGbp = Math.round(cashGbp * 1.32);
  const cashSavingGbp = wasGbp - cashGbp;
  const creditsIfCash = round2(cashGbp * CASHBACK_RATE);

  const best = [...(awards || [])].sort((a, b) => a.pointsCost - b.pointsCost)[0] || null;
  let pointsOption = null;
  let centsPerPoint = null;
  let rating = "typical";
  if (best) {
    const benchmark = AWARD_PROGRAMME_INFO[best.programme]?.benchmarkCpp || 1.0;
    const flightValueGbp = Math.round(cashGbp * 0.55); // flight portion of the package
    centsPerPoint = round2(((flightValueGbp - (best.taxesGbp || 0)) / best.pointsCost) * 100);
    if (centsPerPoint < 0) centsPerPoint = round2((flightValueGbp / best.pointsCost) * 100);
    rating = ratingFromCpp(centsPerPoint, benchmark);
    pointsOption = {
      programme: best.programme,
      pointsCost: best.pointsCost,
      cabin: best.cabin,
      availableDates: (awards || []).map((a) => a.date).slice(0, 3),
      valueGbp: flightValueGbp,
      centsPerPoint,
      aboveBenchmark: centsPerPoint >= benchmark,
      bookingUrl: best.affiliateUrl || best.bookingUrl || null,
      seatsAvailable: best.seatsAvail ?? best.seatsAvailable ?? null,
      source: env.hasSeatsAero ? "seats_aero" : "seats_aero_mock",
    };
  }

  const bestOptionType = rating === "excellent" || rating === "good" ? "points" : "cash";
  const seats = pointsOption?.seatsAvailable;
  const urgencySignal = seats != null && seats <= 3 ? `${seats} seats left` : null;
  const heldProgramme = loyaltyAccounts[0]?.programme;

  const specLine = `${cat.country ? `${cat.city.toUpperCase()}, ${cat.country.toUpperCase()}` : cat.city.toUpperCase()} · ${origin} → ${destination}`;

  return {
    destination: cat.city,
    destinationCity: cat.country ? `${cat.city}, ${cat.country}` : cat.city,
    origin,
    imageUrl: null,
    specLine,
    rating: round2(Math.min(9.9, 7 + (centsPerPoint || 1) * 0.9)),
    pointsOption,
    cashOption: { priceGbp: cashGbp, supplier: "duffel", creditsEarned: creditsIfCash, offerId: null },
    hotelOption: null,
    aiInsight: pointsOption
      ? `${pointsOption.pointsCost.toLocaleString()} ${awardProgrammeName(pointsOption.programme)} pts gets you here — ${centsPerPoint}¢/pt.`
      : `Solid cash value to ${cat.city} right now — earn £${creditsIfCash.toFixed(2)} back.`,
    whyPersonalised: heldProgramme
      ? `Matched to your ${heldProgramme.replace(/_/g, " ")} balance`
      : "Based on your recent searches",
    urgencySignal,
    bestOptionType,
    pointsValueRating: rating,
    centsPerPoint,
    cashSavingGbp,
    creditsIfCash,
  };
}

function mockRecommendations({ awardRows, loyaltyAccounts, homeAirport, targets }) {
  const byDest = {};
  for (const row of awardRows) (byDest[row.destination] ||= []).push(row);

  return targets.map((destination) =>
    buildMockRecommendation({
      destination,
      origin: homeAirport,
      awards: byDest[destination] || [],
      loyaltyAccounts,
    })
  );
}

async function claudeRecommendations({ awardRows, loyaltyAccounts, homeAirport }) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const loyaltySummary = loyaltyAccounts.map((a) => ({
    programme: a.programme,
    balance: a.balance,
    valueGbp: a.valueGbp,
    statusTier: a.statusTier,
  }));

  const prompt = `You are Bonza's personalisation engine. Generate 4-6 travel package recommendations for this user. Use ONLY the real award availability data provided — never invent availability. Each recommendation must map to the existing PackageCard component fields.

USER LOYALTY PROFILE:
Home airport: ${homeAirport}
Programmes: ${JSON.stringify(loyaltySummary)}

REAL AWARD AVAILABILITY (Seats.aero — verified):
${JSON.stringify(awardRows)}

For each recommendation produce a JSON object with these exact fields:
- destination (city name, e.g. "Lisbon")
- destinationCity (display name, e.g. "Lisbon, Portugal")
- origin (e.g. "LHR")
- specLine (e.g. "7 NTS · 5-STAR · TAP PORTUGAL")
- rating (number 7.0-9.9 based on value)
- pointsOption (null if no award availability found)
- cashOption (always include — cash price estimate + creditsEarned at 3%)
- hotelOption (null if not applicable)
- aiInsight (one specific line about this recommendation for this user)
- whyPersonalised (why Bonza is showing this to THIS user specifically)
- urgencySignal (seats remaining or expiry alert — null if neither applies)
- bestOptionType ('points' | 'cash' | 'hybrid')
- pointsValueRating ('excellent' | 'good' | 'typical' | 'below_average')
- centsPerPoint (number — the actual ¢/pt value if points option exists)
- cashSavingGbp (estimated saving vs full retail)
- creditsIfCash (cash package total × 0.03 — always calculate and include)

creditsIfCash must always be included. Return ONLY a JSON array. No preamble, no markdown fences.`;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text.replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

async function runJobForUser(userId, { force = false } = {}) {
  const tier = await getUserRefreshTier(userId);
  if (!force && (!tier || tier === "dormant")) return { skipped: true, reason: "dormant" };

  const tierConfig = REFRESH_TIERS[tier] || REFRESH_TIERS.active_pro;
  const { maxAgeDays, destinations: maxDest } = tierConfig;

  if (!force) {
    const lastRec = await prisma.personalisedRecommendation.findFirst({
      where: { userId, isActive: true },
      orderBy: { generatedAt: "desc" },
    });
    const ageHours = lastRec ? (Date.now() - lastRec.generatedAt.getTime()) / (60 * 60 * 1000) : 999;
    if (ageHours < maxAgeDays * 24) return { skipped: true, reason: "fresh_enough" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { loyaltyAccounts: true },
  });
  if (!user) return { skipped: true, reason: "no_user" };
  if (!user.loyaltyAccounts.length) return { skipped: true, reason: "incomplete_profile" };

  let homeAirport = user.homeAirport;
  if (!homeAirport) {
    const latestTrip = await prisma.trip.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { origin: true },
    });
    homeAirport = latestTrip?.origin || null;
  }
  if (!homeAirport) return { skipped: true, reason: "no_home_airport" };

  const targets = await generateDestinationTargets(userId, maxDest);
  if (!targets.length) return { skipped: true, reason: "no_targets" };

  const programmes = user.loyaltyAccounts.map((a) => a.programme);

  const awardRows = [];
  for (const destination of targets) {
    const cached = await prisma.awardAvailability.findMany({
      where: { userId, origin: homeAirport, destination, expiresAt: { gt: new Date() } },
    });
    if (cached.length) {
      awardRows.push(...cached);
      continue;
    }
    try {
      const results = await searchAwardFlights({ origin: homeAirport, destination, programmes });
      for (const r of results.slice(0, 5)) {
        const row = await prisma.awardAvailability.create({
          data: {
            userId,
            origin: homeAirport,
            destination,
            programme: r.programme,
            date: new Date(r.date),
            cabin: r.cabin,
            pointsCost: r.pointsCost,
            seatsAvail: r.seatsAvailable ?? null,
            taxesGbp: r.taxesGbp ?? null,
            bookingUrl: r.affiliateUrl || r.bookingUrl || null,
            expiresAt: new Date(Date.now() + DAY_MS),
          },
        });
        awardRows.push(row);
      }
    } catch (err) {
      logger.error(`[personalisationJob] Seats.aero failed for ${destination}`, err);
    }
  }

  let recommendations;
  try {
    recommendations = env.hasRealAnthropicKey
      ? await claudeRecommendations({ awardRows, loyaltyAccounts: user.loyaltyAccounts, homeAirport })
      : mockRecommendations({ awardRows, loyaltyAccounts: user.loyaltyAccounts, homeAirport, targets });
  } catch (err) {
    logger.error("[personalisationJob] card generation failed", err);
    return { error: "generation_failed" };
  }
  if (!Array.isArray(recommendations) || !recommendations.length) {
    return { skipped: true, reason: "no_recommendations" };
  }

  const prevActive = await prisma.personalisedRecommendation.findMany({
    where: { userId, isActive: true },
    select: { destination: true, cashOption: true },
  });
  const prevPriceByDest = {};
  for (const p of prevActive) {
    const price = p.cashOption?.priceGbp;
    if (price != null) prevPriceByDest[p.destination] = price;
  }

  await prisma.personalisedRecommendation.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });
  for (const rec of recommendations) {
    await prisma.personalisedRecommendation.create({
      data: {
        userId,
        destination: rec.destination,
        destinationCity: rec.destinationCity,
        origin: rec.origin || homeAirport,
        imageUrl: rec.imageUrl || null,
        specLine: rec.specLine,
        rating: rec.rating ?? null,
        pointsOption: rec.pointsOption || null,
        cashOption: rec.cashOption || null,
        hotelOption: rec.hotelOption || null,
        aiInsight: rec.aiInsight,
        whyPersonalised: rec.whyPersonalised,
        urgencySignal: rec.urgencySignal || null,
        bestOptionType: rec.bestOptionType,
        pointsValueRating: rec.pointsValueRating,
        centsPerPoint: rec.centsPerPoint ?? null,
        cashSavingGbp: rec.cashSavingGbp ?? null,
        creditsIfCash: rec.creditsIfCash ?? null,
        expiresAt: new Date(Date.now() + 2 * DAY_MS),
      },
    });
  }

  recordEvent(userId, EVENT_TYPES.RECOMMENDATIONS_GENERATED, {
    count: recommendations.length,
    destinations: targets,
    tier,
    mock: !env.hasRealAnthropicKey,
  });

  for (const rec of recommendations) {
    if (rec.pointsOption && ["excellent", "good"].includes(rec.pointsValueRating)) {
      triggerAwardAlert(userId, rec);
    }
    const prev = prevPriceByDest[rec.destination];
    const now = rec.cashOption?.priceGbp;
    if (prev != null && now != null && prev - now >= 20) {
      triggerPriceDrop(userId, { destination: rec.destinationCity || rec.destination }, prev, now, rec.cashOption?.offerId || null);
    }
  }

  for (const account of user.loyaltyAccounts) {
    if (!account.pointsExpireAt) continue;
    const match = recommendations.find((r) => r.pointsOption?.programme === account.programme);
    triggerExpiryWarning(userId, account, match || null);
  }

  return { generated: recommendations.length, destinations: targets, tier };
}

async function runNightlyJobs() {
  const users = await prisma.user.findMany({
    where: { lastLoginAt: { gt: new Date(Date.now() - 30 * DAY_MS) } },
    select: { id: true },
  });

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  for (const u of users) {
    try {
      const result = await runJobForUser(u.id);
      result.skipped ? skipped++ : processed++;
      await new Promise((r) => setTimeout(r, 200)); // avoid rate spikes
    } catch (err) {
      logger.error(`[personalisationJob] job failed for ${u.id}`, err);
      errors++;
    }
  }
  logger.info(`[personalisationJob] nightly: ${processed} processed, ${skipped} skipped, ${errors} errors`);
  return { processed, skipped, errors };
}

module.exports = { runJobForUser, runNightlyJobs };
