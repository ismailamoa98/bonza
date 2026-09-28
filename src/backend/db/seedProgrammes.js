// db/seedProgrammes.js — Phase 14 reference data: programme valuations + the transfer graph.
// Comprehensive catalog of the major hotel / airline / credit-card loyalty currencies. Rarely changes —
// seeded once here, valuations refreshed nightly (jobs/valuationRefreshJob.js). Called from db/seed.js.
const prisma = require("../config/database");

const PROGRAMMES = [
  // ── Cards (transferable currencies) ────────────────────────────────
  { programme: "amex_mr", displayName: "Amex Membership Rewards", category: "card", brandColor: "#B0552F", centsPerPoint: 1.4, benchmarkCpp: 1.3, isTransferable: true },
  { programme: "chase_ur", displayName: "Chase Ultimate Rewards", category: "card", brandColor: "#117ACA", centsPerPoint: 1.5, benchmarkCpp: 1.4, isTransferable: true },
  { programme: "capital_one", displayName: "Capital One Miles", category: "card", brandColor: "#004977", centsPerPoint: 1.4, benchmarkCpp: 1.3, currency: "miles", isTransferable: true },
  { programme: "citi_typ", displayName: "Citi ThankYou Points", category: "card", brandColor: "#0563C1", centsPerPoint: 1.4, benchmarkCpp: 1.3, isTransferable: true },
  { programme: "bilt", displayName: "Bilt Rewards", category: "card", brandColor: "#1A1A1A", centsPerPoint: 1.6, benchmarkCpp: 1.5, isTransferable: true },
  { programme: "wells_fargo", displayName: "Wells Fargo Rewards", category: "card", brandColor: "#D71E28", centsPerPoint: 1.2, benchmarkCpp: 1.1, isTransferable: true },

  // ── Hotels ─────────────────────────────────────────────────────────
  { programme: "marriott_bonvoy", displayName: "Marriott Bonvoy", category: "hotel", brandColor: "#8B1A3A", centsPerPoint: 0.8, benchmarkCpp: 0.8, isTransferable: true },
  { programme: "hilton_honors", displayName: "Hilton Honors", category: "hotel", brandColor: "#104F8F", centsPerPoint: 0.5, benchmarkCpp: 0.5 },
  { programme: "world_of_hyatt", displayName: "World of Hyatt", category: "hotel", brandColor: "#1A1A1A", centsPerPoint: 1.7, benchmarkCpp: 1.5 },
  { programme: "ihg_one", displayName: "IHG One Rewards", category: "hotel", brandColor: "#C8102E", centsPerPoint: 0.5, benchmarkCpp: 0.6 },
  { programme: "accor", displayName: "Accor Live Limitless", category: "hotel", brandColor: "#1B1F3B", centsPerPoint: 2.2, benchmarkCpp: 2.0 },
  { programme: "wyndham", displayName: "Wyndham Rewards", category: "hotel", brandColor: "#003DA5", centsPerPoint: 0.9, benchmarkCpp: 1.0 },
  { programme: "choice", displayName: "Choice Privileges", category: "hotel", brandColor: "#E01A2B", centsPerPoint: 0.6, benchmarkCpp: 0.6 },
  { programme: "best_western", displayName: "Best Western Rewards", category: "hotel", brandColor: "#003767", centsPerPoint: 0.6, benchmarkCpp: 0.6 },
  { programme: "radisson", displayName: "Radisson Rewards", category: "hotel", brandColor: "#C8102E", centsPerPoint: 0.4, benchmarkCpp: 0.4 },
  { programme: "gha_discovery", displayName: "GHA Discovery", category: "hotel", brandColor: "#B08D57", centsPerPoint: 0.7, benchmarkCpp: 0.7 },

  // ── Airlines ───────────────────────────────────────────────────────
  { programme: "ba_avios", displayName: "British Airways Executive Club", category: "airline", brandColor: "#075AAA", centsPerPoint: 1.1, benchmarkCpp: 1.1, currency: "Avios", isTransferable: true },
  { programme: "united_mp", displayName: "United MileagePlus", category: "airline", brandColor: "#002244", centsPerPoint: 1.2, benchmarkCpp: 1.2, currency: "miles" },
  { programme: "virgin_flying_club", displayName: "Virgin Atlantic Flying Club", category: "airline", brandColor: "#E10A0A", centsPerPoint: 1.9, benchmarkCpp: 1.5 },
  { programme: "aeroplan", displayName: "Air Canada Aeroplan", category: "airline", brandColor: "#D2202E", centsPerPoint: 1.5, benchmarkCpp: 1.4 },
  { programme: "flying_blue", displayName: "Air France KLM Flying Blue", category: "airline", brandColor: "#003F7D", centsPerPoint: 1.2, benchmarkCpp: 1.2 },
  { programme: "krisflyer", displayName: "Singapore KrisFlyer", category: "airline", brandColor: "#F5A623", centsPerPoint: 1.3, benchmarkCpp: 1.3 },
  { programme: "emirates_skywards", displayName: "Emirates Skywards", category: "airline", brandColor: "#C8102E", centsPerPoint: 1.2, benchmarkCpp: 1.2 },
  { programme: "aer_lingus", displayName: "Aer Lingus AerClub", category: "airline", brandColor: "#00847A", centsPerPoint: 1.1, benchmarkCpp: 1.1, currency: "Avios" },
  { programme: "iberia_plus", displayName: "Iberia Plus", category: "airline", brandColor: "#D8232A", centsPerPoint: 1.3, benchmarkCpp: 1.2, currency: "Avios" },
  { programme: "aa_advantage", displayName: "American AAdvantage", category: "airline", brandColor: "#0078D2", centsPerPoint: 1.5, benchmarkCpp: 1.4, currency: "miles" },
  { programme: "delta_skymiles", displayName: "Delta SkyMiles", category: "airline", brandColor: "#003268", centsPerPoint: 1.1, benchmarkCpp: 1.2, currency: "miles" },
  { programme: "southwest", displayName: "Southwest Rapid Rewards", category: "airline", brandColor: "#304CB2", centsPerPoint: 1.3, benchmarkCpp: 1.4 },
  { programme: "jetblue", displayName: "JetBlue TrueBlue", category: "airline", brandColor: "#003876", centsPerPoint: 1.3, benchmarkCpp: 1.3 },
  { programme: "alaska", displayName: "Alaska Mileage Plan", category: "airline", brandColor: "#01426A", centsPerPoint: 1.4, benchmarkCpp: 1.4, currency: "miles" },
  { programme: "miles_and_more", displayName: "Lufthansa Miles & More", category: "airline", brandColor: "#05164D", centsPerPoint: 1.2, benchmarkCpp: 1.2, currency: "miles" },
  { programme: "qatar_privilege", displayName: "Qatar Privilege Club", category: "airline", brandColor: "#5C0632", centsPerPoint: 1.1, benchmarkCpp: 1.1, currency: "Avios" },
  { programme: "etihad", displayName: "Etihad Guest", category: "airline", brandColor: "#BD8B13", centsPerPoint: 1.0, benchmarkCpp: 1.0, currency: "miles" },
  { programme: "asia_miles", displayName: "Cathay Asia Miles", category: "airline", brandColor: "#006564", centsPerPoint: 1.3, benchmarkCpp: 1.3, currency: "miles" },
  { programme: "qantas", displayName: "Qantas Frequent Flyer", category: "airline", brandColor: "#E40000", centsPerPoint: 1.2, benchmarkCpp: 1.3 },
  { programme: "ana", displayName: "ANA Mileage Club", category: "airline", brandColor: "#13448F", centsPerPoint: 1.4, benchmarkCpp: 1.4, currency: "miles" },
  { programme: "jal", displayName: "Japan Airlines Mileage Bank", category: "airline", brandColor: "#C00A26", centsPerPoint: 1.4, benchmarkCpp: 1.4, currency: "miles" },
  { programme: "turkish", displayName: "Turkish Miles&Smiles", category: "airline", brandColor: "#C70A0C", centsPerPoint: 1.3, benchmarkCpp: 1.2, currency: "miles" },
  { programme: "lifemiles", displayName: "Avianca LifeMiles", category: "airline", brandColor: "#DA291C", centsPerPoint: 1.5, benchmarkCpp: 1.4, currency: "miles" },
  { programme: "finnair", displayName: "Finnair Plus", category: "airline", brandColor: "#0B1560", centsPerPoint: 1.1, benchmarkCpp: 1.1, currency: "Avios" },
  { programme: "tap", displayName: "TAP Miles&Go", category: "airline", brandColor: "#00A443", centsPerPoint: 1.2, benchmarkCpp: 1.1, currency: "miles" },

  // ── Cars (status only — no points) ─────────────────────────────────
  { programme: "hertz_gold", displayName: "Hertz Gold Plus Rewards", category: "car", brandColor: "#FFD100", centsPerPoint: 0, benchmarkCpp: 0, hasPointsProgramme: false },
  { programme: "avis_preferred", displayName: "Avis Preferred", category: "car", brandColor: "#D4002A", centsPerPoint: 0, benchmarkCpp: 0, hasPointsProgramme: false },
  { programme: "national_emerald", displayName: "National Emerald Club", category: "car", brandColor: "#00693E", centsPerPoint: 0, benchmarkCpp: 0, hasPointsProgramme: false },
];

// from → to, ratioFrom : ratioTo. Keys must exist in PROGRAMMES above.
const TRANSFERS = [
  // Amex Membership Rewards
  ["amex_mr", "ba_avios", 1, 1], ["amex_mr", "virgin_flying_club", 1, 1], ["amex_mr", "flying_blue", 1, 1],
  ["amex_mr", "emirates_skywards", 1, 1], ["amex_mr", "krisflyer", 1, 1], ["amex_mr", "aer_lingus", 1, 1],
  ["amex_mr", "iberia_plus", 1, 1], ["amex_mr", "aeroplan", 1, 1], ["amex_mr", "ana", 1, 1],
  ["amex_mr", "asia_miles", 1, 1], ["amex_mr", "etihad", 1, 1], ["amex_mr", "qantas", 1, 1],
  ["amex_mr", "delta_skymiles", 1, 1], ["amex_mr", "marriott_bonvoy", 1, 1], ["amex_mr", "hilton_honors", 1, 2],

  // Chase Ultimate Rewards
  ["chase_ur", "world_of_hyatt", 1, 1], ["chase_ur", "aeroplan", 1, 1], ["chase_ur", "ba_avios", 1, 1],
  ["chase_ur", "flying_blue", 1, 1], ["chase_ur", "united_mp", 1, 1], ["chase_ur", "virgin_flying_club", 1, 1],
  ["chase_ur", "emirates_skywards", 1, 1], ["chase_ur", "krisflyer", 1, 1], ["chase_ur", "aer_lingus", 1, 1],
  ["chase_ur", "iberia_plus", 1, 1], ["chase_ur", "marriott_bonvoy", 1, 1], ["chase_ur", "ihg_one", 1, 1],
  ["chase_ur", "southwest", 1, 1], ["chase_ur", "jetblue", 1, 1],

  // Capital One Miles
  ["capital_one", "aeroplan", 1, 1], ["capital_one", "flying_blue", 1, 1], ["capital_one", "ba_avios", 1, 1],
  ["capital_one", "virgin_flying_club", 1, 1], ["capital_one", "emirates_skywards", 1, 1], ["capital_one", "krisflyer", 1, 1],
  ["capital_one", "etihad", 1, 1], ["capital_one", "qantas", 1, 1], ["capital_one", "asia_miles", 1, 1],
  ["capital_one", "aer_lingus", 1, 1], ["capital_one", "finnair", 1, 1], ["capital_one", "tap", 1, 1],
  ["capital_one", "turkish", 1, 1], ["capital_one", "lifemiles", 1, 1], ["capital_one", "accor", 2, 1],

  // Citi ThankYou Points
  ["citi_typ", "flying_blue", 1, 1], ["citi_typ", "virgin_flying_club", 1, 1], ["citi_typ", "emirates_skywards", 1, 1],
  ["citi_typ", "krisflyer", 1, 1], ["citi_typ", "qantas", 1, 1], ["citi_typ", "asia_miles", 1, 1],
  ["citi_typ", "etihad", 1, 1], ["citi_typ", "turkish", 1, 1], ["citi_typ", "jetblue", 1, 1],
  ["citi_typ", "aer_lingus", 1, 1], ["citi_typ", "lifemiles", 1, 1],

  // Bilt Rewards
  ["bilt", "aeroplan", 1, 1], ["bilt", "flying_blue", 1, 1], ["bilt", "ba_avios", 1, 1],
  ["bilt", "virgin_flying_club", 1, 1], ["bilt", "emirates_skywards", 1, 1], ["bilt", "krisflyer", 1, 1],
  ["bilt", "turkish", 1, 1], ["bilt", "aer_lingus", 1, 1], ["bilt", "iberia_plus", 1, 1],
  ["bilt", "world_of_hyatt", 1, 1], ["bilt", "marriott_bonvoy", 1, 1], ["bilt", "ihg_one", 1, 1],
  ["bilt", "alaska", 1, 1], ["bilt", "asia_miles", 1, 1], ["bilt", "lifemiles", 1, 1],

  // Wells Fargo Rewards
  ["wells_fargo", "ba_avios", 1, 1], ["wells_fargo", "flying_blue", 1, 1], ["wells_fargo", "virgin_flying_club", 1, 1],
  ["wells_fargo", "aer_lingus", 1, 1], ["wells_fargo", "iberia_plus", 1, 1], ["wells_fargo", "lifemiles", 1, 1],

  // Marriott Bonvoy → airlines at 3:1
  ["marriott_bonvoy", "ba_avios", 3, 1], ["marriott_bonvoy", "united_mp", 3, 1], ["marriott_bonvoy", "aeroplan", 3, 1],
  ["marriott_bonvoy", "flying_blue", 3, 1], ["marriott_bonvoy", "iberia_plus", 3, 1], ["marriott_bonvoy", "aer_lingus", 3, 1],
  ["marriott_bonvoy", "alaska", 3, 1], ["marriott_bonvoy", "delta_skymiles", 3, 1], ["marriott_bonvoy", "ana", 3, 1],
  ["marriott_bonvoy", "qantas", 3, 1], ["marriott_bonvoy", "asia_miles", 3, 1], ["marriott_bonvoy", "emirates_skywards", 3, 1],
  ["marriott_bonvoy", "krisflyer", 3, 1], ["marriott_bonvoy", "virgin_flying_club", 3, 1], ["marriott_bonvoy", "aa_advantage", 3, 1],

  // Avios family (1:1 between Avios currencies)
  ["ba_avios", "iberia_plus", 1, 1], ["ba_avios", "aer_lingus", 1, 1], ["ba_avios", "qatar_privilege", 1, 1],
  ["ba_avios", "finnair", 1, 1], ["iberia_plus", "ba_avios", 1, 1], ["aer_lingus", "ba_avios", 1, 1],
];

// Phase 14: short brand marks for the logo-tile initials fallback (shown in each programme's brandColor
// when no logo asset is present). Not globally unique — each mark only ever appears on its own tile.
const INITIALS = {
  amex_mr: "AX", chase_ur: "CH", capital_one: "C1", citi_typ: "CI", bilt: "B", wells_fargo: "WF",
  marriott_bonvoy: "M", hilton_honors: "H", world_of_hyatt: "HY", ihg_one: "IHG", accor: "AL",
  wyndham: "WY", choice: "CP", best_western: "BW", radisson: "RR", gha_discovery: "GHA",
  ba_avios: "BA", united_mp: "UA", virgin_flying_club: "VS", aeroplan: "AP", flying_blue: "FB",
  krisflyer: "KF", emirates_skywards: "EK", aer_lingus: "EI", iberia_plus: "IB", aa_advantage: "AA",
  delta_skymiles: "DL", southwest: "SW", jetblue: "JB", alaska: "AS", miles_and_more: "MM",
  qatar_privilege: "QR", etihad: "EY", asia_miles: "CX", qantas: "QF", ana: "NH", jal: "JL",
  turkish: "TK", lifemiles: "LM", finnair: "AY", tap: "TP",
  hertz_gold: "HZ", avis_preferred: "AV", national_emerald: "NE",
};

// Fallback: first letters of the first two significant words (e.g. "Choice Privileges" → "CP").
function deriveInitials(displayName) {
  const words = String(displayName || "?").replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(Boolean);
  return (words.slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
}

async function seedProgrammes() {
  for (const p of PROGRAMMES) {
    const data = { ...p, initials: INITIALS[p.programme] || deriveInitials(p.displayName) };
    await prisma.programmeValuation.upsert({
      where: { programme: p.programme },
      update: data,
      create: data,
    });
  }

  for (const [from, to, rFrom, rTo] of TRANSFERS) {
    await prisma.transferPartner.upsert({
      where: { fromProgramme_toProgramme: { fromProgramme: from, toProgramme: to } },
      update: { ratioFrom: rFrom, ratioTo: rTo, isActive: true },
      create: { fromProgramme: from, toProgramme: to, ratioFrom: rFrom, ratioTo: rTo },
    });
  }

  console.log(`Seeded ${PROGRAMMES.length} programmes, ${TRANSFERS.length} transfer pairs`);
}

module.exports = { seedProgrammes, PROGRAMMES, TRANSFERS };
