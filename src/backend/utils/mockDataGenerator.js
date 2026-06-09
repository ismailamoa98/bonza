// utils/mockDataGenerator.js — Mock API responses (multi-vendor).
// Generates the 5 optimization scenarios (transfer / status / cash / hybrid /
// direct) plus Bonza's opening analysis without calling any external API.
// Used as the default during development and as the fallback when the Claude
// API is unavailable (see utils/claudeOptimizer.js).
//
// Each scenario now carries a *menu of vendors* per category (flight/hotel/car)
// so the UI can offer a comparison table and recalculate cost/points/savings
// live as the user swaps vendors. The menu is shared across scenarios; each
// scenario differs by which vendor it pre-selects (its strategy's default).
// Headline totals are derived from the selected vendors so a client-side
// recompute from `vendors` matches the persisted numbers exactly.

// --- Vendor menus -----------------------------------------------------------
// cashCost  = cash you pay out of pocket if you pick this vendor.
// cashValue = retail cash price of this option (used for savings = value − paid).
// pointsCost = loyalty points spent.
const FLIGHT_MENU = [
  { id: "f_united", vendor: "United", label: "Business", cashCost: 0, cashValue: 5000, pointsCost: 75000, pointsProgram: "amex", benefits: ["businessCabin", "loungeAccess"] },
  { id: "f_qatar", vendor: "Qatar Airways", label: "Business (Qsuite)", cashCost: 0, cashValue: 5400, pointsCost: 80000, pointsProgram: "amex", benefits: ["businessCabin", "loungeAccess"] },
  { id: "f_etihad", vendor: "Etihad", label: "Premium Economy", cashCost: 0, cashValue: 2400, pointsCost: 50000, pointsProgram: "amex", benefits: ["loungeAccess"] },
  { id: "f_cash", vendor: "Pay Cash", label: "Economy", cashCost: 800, cashValue: 800, pointsCost: 0, pointsProgram: "none", benefits: ["earnPoints"] },
];

const HOTEL_MENU = [
  { id: "h_marriott", vendor: "Marriott", label: "Suite (Le Marais)", cashCost: 0, cashValue: 2800, pointsCost: 60000, pointsProgram: "amex", benefits: ["suiteUpgrade", "freeBreakfast"] },
  { id: "h_hyatt", vendor: "Hyatt", label: "Suite", cashCost: 0, cashValue: 2600, pointsCost: 65000, pointsProgram: "chase", benefits: ["suiteUpgrade"] },
  { id: "h_ihg", vendor: "IHG", label: "Standard Room", cashCost: 0, cashValue: 1600, pointsCost: 45000, pointsProgram: "chase", benefits: [] },
  { id: "h_cash", vendor: "Pay Cash", label: "4-star Standard", cashCost: 1500, cashValue: 1500, pointsCost: 0, pointsProgram: "none", benefits: ["freeChanges"] },
];

const CAR_MENU = [
  { id: "c_hertz", vendor: "Hertz", label: "Economy", cashCost: 400, cashValue: 400, pointsCost: 0, pointsProgram: "none", benefits: [] },
  { id: "c_enterprise", vendor: "Enterprise", label: "Economy", cashCost: 360, cashValue: 360, pointsCost: 0, pointsProgram: "none", benefits: [] },
  { id: "c_alamo", vendor: "Alamo", label: "Economy", cashCost: 340, cashValue: 340, pointsCost: 0, pointsProgram: "none", benefits: [] },
  { id: "c_avis", vendor: "Avis", label: "Midsize", cashCost: 480, cashValue: 480, pointsCost: 0, pointsProgram: "none", benefits: ["freeUpgrade"] },
];

// Returns a fresh copy of a menu with the chosen vendor flagged recommended.
function menuWith(menu, pickId) {
  return menu.map((v) => ({ ...v, recommended: v.id === pickId }));
}

const find = (menu, id) => menu.find((v) => v.id === id);

// Points the traveler can deploy toward award bookings (transferable balances).
const availablePoints = (loyaltyPoints) =>
  (loyaltyPoints?.amex || 0) + (loyaltyPoints?.chaseUr || 0);

// The optimal fraction to pay with points: as much as the balance allows, since
// every point swapped in avoids cash. Capped at 1.
function optimalRatio(selected, loyaltyPoints) {
  const fullAwardPoints = selected.reduce((sum, v) => sum + (v.pointsCost > 0 ? v.pointsCost : 0), 0);
  if (fullAwardPoints <= 0) return 0;
  return Math.min(1, availablePoints(loyaltyPoints) / fullAwardPoints);
}

// The cash-tier price for a category = its "Pay Cash" vendor's cash cost (e.g.
// economy flight $800). This is the cash you'd pay for that leg if NOT using
// points — never the premium award product's retail price.
function cashOptionPrice(menu) {
  const cashVendor = menu.find((v) => v.pointsCost === 0);
  return cashVendor ? cashVendor.cashCost : 0;
}

// Headline totals for the selected vendors at a points/cash ratio r.
// Each award leg (pointsCost > 0) interpolates between its cash-tier option
// (r=0: pay the cash-option price, 0 points) and a full award (r=1: pay 0 cash,
// P points). Savings = cash-tier price avoided = cashOption·r. Cash-only legs
// (cars, Pay Cash picks) are always cash and never exceed the cash-trip total.
function totalsAtRatio(items, ratio) {
  let cashPaid = 0;
  let pointsUsed = 0;
  let savings = 0;
  for (const { vendor, cashOption } of items) {
    if (vendor.pointsCost > 0) {
      cashPaid += cashOption * (1 - ratio);
      pointsUsed += vendor.pointsCost * ratio;
      savings += cashOption * ratio;
    } else {
      cashPaid += vendor.cashCost;
    }
  }
  return {
    totalCashCost: Math.round(cashPaid),
    pointsUsed: Math.round(pointsUsed),
    savingsAmount: Math.round(savings),
  };
}

// Builds one scenario's flight/hotel/car blocks from the picked vendor ids and
// computes headline totals at the backend-chosen optimal points/cash ratio.
function buildScenario({ trip, strategy, picks, valueMultiplier, reasoning, isRecommended, loyaltyPoints }) {
  const flight = find(FLIGHT_MENU, picks.flight);
  const hotel = find(HOTEL_MENU, picks.hotel);
  const car = find(CAR_MENU, picks.car);
  const selected = [flight, hotel, car];
  const items = [
    { vendor: flight, cashOption: cashOptionPrice(FLIGHT_MENU) },
    { vendor: hotel, cashOption: cashOptionPrice(HOTEL_MENU) },
    { vendor: car, cashOption: cashOptionPrice(CAR_MENU) },
  ];

  const recommendedRatio = optimalRatio(selected, loyaltyPoints);
  const { totalCashCost, pointsUsed, savingsAmount } = totalsAtRatio(items, recommendedRatio);
  // Points come from whichever award programs the picks use.
  const pointsProgram =
    selected.find((v) => v.pointsCost > 0 && v.pointsProgram !== "none")?.pointsProgram || "none";
  // Scenario-level perks = union of the selected vendors' benefits.
  const benefits = [...new Set(selected.flatMap((v) => v.benefits))];

  return {
    strategy,
    totalCashCost,
    pointsUsed,
    pointsProgram,
    savingsAmount,
    valueMultiplier,
    recommendedRatio,
    reasoning,
    isRecommended,
    benefits,
    flightDetails: {
      airline: flight.vendor,
      cabin: flight.label,
      from: trip.origin,
      to: trip.destination,
      selectedVendorId: flight.id,
      vendors: menuWith(FLIGHT_MENU, flight.id),
    },
    hotelDetails: {
      name: hotel.label,
      program: hotel.vendor,
      nights: 7,
      selectedVendorId: hotel.id,
      vendors: menuWith(HOTEL_MENU, hotel.id),
    },
    carDetails: {
      vendor: car.vendor,
      cost: car.cashCost,
      selectedVendorId: car.id,
      vendors: menuWith(CAR_MENU, car.id),
    },
  };
}

// Returns scenario specs in the shape persisted to the Scenario model, plus a
// conversational opener. Exactly one scenario has isRecommended: true.
exports.generateMockScenarios = (trip, loyaltyPoints) => {
  const dest = trip.destination || "your destination";

  const make = (opts) => buildScenario({ trip, loyaltyPoints, ...opts });

  const scenarios = [
    make({
      strategy: "transfer",
      picks: { flight: "f_united", hotel: "h_marriott", car: "c_hertz" },
      valueMultiplier: 1.41,
      isRecommended: true,
      reasoning:
        "Transfer AMEX to United during the current 1.25x bonus for business class, " +
        "then AMEX to Marriott for a luxury-collection suite. Best overall value.",
    }),
    make({
      strategy: "status",
      picks: { flight: "f_etihad", hotel: "h_hyatt", car: "c_enterprise" },
      valueMultiplier: 1.15,
      isRecommended: false,
      reasoning:
        "Leverage your status for upgrades and free changes. More flexible if your dates might move.",
    }),
    make({
      strategy: "cash",
      picks: { flight: "f_cash", hotel: "h_cash", car: "c_alamo" },
      valueMultiplier: 1.0,
      isRecommended: false,
      reasoning:
        "Pay all cash and keep your points. You earn ~$560 in new points but get the least value.",
    }),
    make({
      strategy: "hybrid",
      picks: { flight: "f_etihad", hotel: "h_cash", car: "c_hertz" },
      valueMultiplier: 1.2,
      isRecommended: false,
      reasoning: "Split points and cash for a balance of value and flexibility.",
    }),
    make({
      strategy: "direct",
      picks: { flight: "f_etihad", hotel: "h_ihg", car: "c_avis" },
      valueMultiplier: 1.05,
      isRecommended: false,
      reasoning: "Redeem points directly with no transfers — simplest, but lowest value per point.",
    }),
  ];

  const recommended = scenarios.find((s) => s.isRecommended) || scenarios[0];

  const conversationalAnalysis =
    `${dest} — great choice. You've got ${loyaltyPoints.amex.toLocaleString()} AMEX points and ` +
    `${loyaltyPoints.chaseUr.toLocaleString()} Chase UR to work with. I've put together your optimal ` +
    `package: business class plus a suite, mostly on points. Use the slider to dial the points-vs-cash ` +
    `mix, or open "Compare vendor options" to swap any vendor — I'll update the numbers live.`;

  return { scenarios, conversationalAnalysis, recommendedRatio: recommended.recommendedRatio };
};

// Exposed for reuse/tests.
exports.VENDOR_MENUS = { flight: FLIGHT_MENU, hotel: HOTEL_MENU, car: CAR_MENU };
