// store/appStore.js — Zustand global store for the 3-step flow.
// Holds the trip, loyalty points, generated scenarios + selection, per-scenario
// vendor picks, chat thread, and the booking link / affiliate links. Each step
// reads/writes this store so state survives navigation between Step 1 -> 2 -> 3.
import { create } from "zustand";

const initialState = {
  trip: null, // the submitted trip form { origin, destination, checkIn, checkOut, budget, ... }
  tripId: null, // id returned by POST /trips
  loyaltyPoints: null, // { amex, chaseUr, unitedMiles, marriottPoints, other }
  scenarios: [], // 5 scenario objects from POST /optimize
  recommendedScenarioId: null,
  selectedScenarioId: null, // the scenario shown as the optimal package
  vendorSelections: {}, // { [scenarioId]: { flight, hotel, car } } vendor ids
  ratio: 1, // global points<->cash mix (0 = all cash, 1 = max points)
  recommendedRatio: 1, // computed optimal ratio (slider default)
  chatMessages: [], // [{ role: "bonza" | "user", content, ts? }]
  bookingLink: null, // { token, url, expiresAt }
  affiliateLinks: null, // { flight, hotel, car }
  currentPackage: null, // the marketing package opened from the homepage (booking-page flavor)

  // --- Browse & optimize (Step 2) ---
  activeTab: "hotels", // "hotels" | "flights" | "cars"
  // Per-tab filters so a hotel price cap never filters out flights, etc.
  filters: {
    hotels: {
      minPrice: null,
      maxPrice: null,
      stars: [],
      amenities: [],
      loyalty: [],
      minRating: null,
      propertyType: [],
      freeCancellation: false,
      breakfast: false,
      sort: "recommended",
    },
    flights: {
      minPrice: null,
      maxPrice: null,
      airlines: [],
      cabin: null,
      departureTime: [],
      arrivalTime: [],
      maxStops: null,
      refundable: false,
      baggage: false,
      maxDuration: null,
      sort: "recommended",
    },
    cars: { minPrice: null, maxPrice: null, carClass: [], vendors: [], sort: "recommended" },
  },
  hotels: [], // current hotel grid results
  flights: [], // current flight grid results
  cars: [], // current car grid results
  selectedFlight: null, // clicked flight object (or null)
  selectedHotel: null, // clicked hotel object (or null)
  selectedCar: null, // clicked car object (or null)
};

// Category -> the scenario field that carries its vendor menu.
export const VENDOR_CATEGORIES = [
  ["flight", "flightDetails"],
  ["hotel", "hotelDetails"],
  ["car", "carDetails"],
];

// Initial vendor pick per scenario = each category's persisted selectedVendorId
// (falling back to the recommended vendor).
function initialVendorSelections(scenarios) {
  const out = {};
  for (const s of scenarios) {
    const pick = {};
    for (const [cat, key] of VENDOR_CATEGORIES) {
      const details = s[key] || {};
      const vendors = details.vendors || [];
      pick[cat] =
        details.selectedVendorId ||
        vendors.find((v) => v.recommended)?.id ||
        vendors[0]?.id ||
        null;
    }
    out[s.id] = pick;
  }
  return out;
}

// Auth lives OUTSIDE initialState so `reset()` — which clears the trip-flow
// fields — never logs the user out. Clerk owns the session; the store only caches
// the user for UI display (avatar/greeting), kept in sync by App's <AuthSync/>.
export const useAppStore = create((set) => ({
  ...initialState,

  // --- Auth (display cache only — Clerk is the source of truth) ---
  user: null, // { id, name, email } | null
  isLoggedIn: false,
  setUser: (user) => set({ user, isLoggedIn: Boolean(user) }),
  logout: () =>
    set({
      user: null,
      isLoggedIn: false,
      // Clear anything sensitive/user-scoped on sign-out.
      loyaltyPoints: null,
      currentPackage: null,
    }),

  setTrip: (trip) => set({ trip }),
  setTripId: (tripId) => set({ tripId }),
  setLoyaltyPoints: (loyaltyPoints) => set({ loyaltyPoints }),
  setCurrentPackage: (currentPackage) => set({ currentPackage }),

  // Seed scenarios + selection + vendor picks + ratio + the opening message.
  setOptimization: ({
    allScenarios,
    recommendedScenarioId,
    conversationalAnalysis,
    recommendedRatio,
  }) =>
    set({
      scenarios: allScenarios || [],
      recommendedScenarioId: recommendedScenarioId || null,
      selectedScenarioId: recommendedScenarioId || null,
      vendorSelections: initialVendorSelections(allScenarios || []),
      ratio: recommendedRatio ?? 1,
      recommendedRatio: recommendedRatio ?? 1,
      chatMessages: conversationalAnalysis
        ? [{ role: "bonza", content: conversationalAnalysis }]
        : [],
    }),

  setSelectedScenario: (selectedScenarioId) => set({ selectedScenarioId }),
  setRatio: (ratio) => set({ ratio }),

  // Swap one category's vendor for a scenario (drives live recalculation).
  setVendor: (scenarioId, category, vendorId) =>
    set((state) => ({
      vendorSelections: {
        ...state.vendorSelections,
        [scenarioId]: { ...state.vendorSelections[scenarioId], [category]: vendorId },
      },
    })),

  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  setBooking: ({ bookingLink, affiliateLinks }) => set({ bookingLink, affiliateLinks }),

  // --- Browse & optimize (Step 2) ---
  setActiveTab: (activeTab) => set({ activeTab }),
  // Merge a partial filter patch into the active tab's filter slice.
  setFilters: (patch) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [state.activeTab]: { ...state.filters[state.activeTab], ...patch },
      },
    })),
  setHotels: (hotels) => set({ hotels }),
  setFlights: (flights) => set({ flights }),
  setCars: (cars) => set({ cars }),

  // Click a flight/hotel/car card. Clicking the selected one again clears it.
  // Every change re-snaps the slider to the affordable optimum (recommendedRatio
  // = the most points the balance can fund for the new flight+hotel+car combo).
  selectFlight: (flight) =>
    set((state) => {
      const next = state.selectedFlight?.id === flight.id ? null : flight;
      const max = maxComboRatio(next, state.selectedHotel, state.selectedCar, state.loyaltyPoints, tripNights(state.trip));
      return { selectedFlight: next, recommendedRatio: max, ratio: max };
    }),
  selectHotel: (hotel) =>
    set((state) => {
      const next = state.selectedHotel?.id === hotel.id ? null : hotel;
      const max = maxComboRatio(state.selectedFlight, next, state.selectedCar, state.loyaltyPoints, tripNights(state.trip));
      return { selectedHotel: next, recommendedRatio: max, ratio: max };
    }),
  selectCar: (car) =>
    set((state) => {
      const next = state.selectedCar?.id === car.id ? null : car;
      const max = maxComboRatio(state.selectedFlight, state.selectedHotel, next, state.loyaltyPoints, tripNights(state.trip));
      return { selectedCar: next, recommendedRatio: max, ratio: max };
    }),

  // Load a full flight+hotel+car combo at once (used by the flexible-dates month
  // chooser) at the optimized points ratio. Unlike selectFlight/Hotel/Car this
  // replaces all three outright rather than toggling.
  setSelections: ({ flight = null, hotel = null, car = null }) =>
    set((state) => {
      const max = maxComboRatio(flight, hotel, car, state.loyaltyPoints, tripNights(state.trip));
      return {
        selectedFlight: flight,
        selectedHotel: hotel,
        selectedCar: car,
        recommendedRatio: max,
        ratio: max,
      };
    }),

  reset: () => set({ ...initialState }),
}));

// --- Pure selectors / helpers ----------------------------------------------

export const selectSelectedScenario = (state) =>
  state.scenarios.find((s) => s.id === state.selectedScenarioId) || null;

// The chosen vendor object for one category of a scenario.
export function getVendor(scenario, category, selection) {
  const key = VENDOR_CATEGORIES.find(([c]) => c === category)?.[1];
  const details = scenario?.[key] || {};
  const vendors = details.vendors || [];
  const id = selection?.[category] || details.selectedVendorId;
  return vendors.find((v) => v.id === id) || vendors.find((v) => v.recommended) || vendors[0] || null;
}

// The cash-tier price for a category = its "Pay Cash" vendor's cash cost (e.g.
// economy flight $800) — the cash you'd pay for that leg if NOT using points.
function cashOptionPrice(scenario, category, fallback) {
  const key = VENDOR_CATEGORIES.find(([c]) => c === category)?.[1];
  const vendors = scenario?.[key]?.vendors || [];
  const cashVendor = vendors.find((v) => v.pointsCost === 0);
  return cashVendor ? cashVendor.cashCost : fallback;
}

// Recompute headline totals from the selected vendors at a points/cash ratio r.
// Each award leg interpolates between its cash-tier option (r=0: pay the cash
// price, 0 points) and a full award (r=1: pay 0 cash, P points). So at r=0 the
// trip costs the full cash-trip total and at r=1 it's mostly points. Savings =
// cash avoided vs that cash-trip total = cashOption·r. Cash-only legs (cars,
// Pay Cash picks) are always cash and add no savings.
export function computeTotals(scenario, selection, ratio = 1) {
  const r = Math.max(0, Math.min(1, ratio));
  let totalCash = 0;
  let pointsUsed = 0;
  let savingsAmount = 0;
  const benefits = [];
  for (const [cat] of VENDOR_CATEGORIES) {
    const v = getVendor(scenario, cat, selection);
    if (!v) continue;
    if (v.pointsCost > 0) {
      const cashOption = cashOptionPrice(scenario, cat, v.cashValue || 0);
      totalCash += cashOption * (1 - r);
      pointsUsed += v.pointsCost * r;
      savingsAmount += cashOption * r;
    } else {
      totalCash += v.cashCost ?? v.cashValue ?? 0;
    }
    benefits.push(...(v.benefits || []));
  }
  // Cash saved per point (cents) — a vendor-mix property, constant across the
  // slider. Lets users see when paying cash is the smarter call (low ¢/pt).
  const pointsValueCents = pointsUsed > 0 ? (savingsAmount / pointsUsed) * 100 : 0;
  return {
    totalCash: Math.round(totalCash),
    pointsUsed: Math.round(pointsUsed),
    savingsAmount: Math.round(savingsAmount),
    pointsValueCents,
    benefits: [...new Set(benefits)],
  };
}

// Largest ratio the traveler's points balance can fund for this selection.
export function maxFeasibleRatio(scenario, selection, loyaltyPoints) {
  let awardPoints = 0;
  for (const [cat] of VENDOR_CATEGORIES) {
    const v = getVendor(scenario, cat, selection);
    if (v && v.pointsCost > 0) awardPoints += v.pointsCost;
  }
  if (awardPoints <= 0) return 0;
  const budget = (loyaltyPoints?.amex || 0) + (loyaltyPoints?.chaseUr || 0);
  return Math.min(1, budget / awardPoints);
}

// { flight: vendorObj, hotel: vendorObj, car: vendorObj } for the booking call.
export function selectedVendorObjects(scenario, selection) {
  const out = {};
  for (const [cat] of VENDOR_CATEGORIES) out[cat] = getVendor(scenario, cat, selection);
  return out;
}

// --- Browse & optimize: flight + hotel + car combination model --------------
// Same blend math as computeTotals, but the "items" come from the clicked grid
// cards (flight / hotel / car) instead of a pre-built scenario's vendor menu.
// Flights & hotels are award-capable (points reduce cash); cars are cash-only.

// Nights between the trip's check-in/out (min 1) — drives hotel + car pricing.
export function tripNights(trip) {
  if (!trip?.checkIn || !trip?.checkOut) return 1;
  const nights = Math.round((new Date(trip.checkOut) - new Date(trip.checkIn)) / 86400000);
  return nights > 0 ? nights : 1;
}

// Reduce a flight to its { cash, points, label }. Points = cheapest award across
// the flight's programs (best value); 0 if no award option.
function flightItem(flight) {
  if (!flight) return null;
  const miles = Object.values(flight.milesRequired || {}).filter((n) => n > 0);
  return {
    type: "flight",
    cash: flight.basePrice || 0,
    points: miles.length ? Math.min(...miles) : 0,
    label: `${flight.airline} · ${flight.cabin}`,
  };
}

// Reduce a hotel to its { cash, points, label } over the trip's nights.
function hotelItem(hotel, nights) {
  if (!hotel) return null;
  const perNight = Object.values(hotel.loyaltyPrograms || {})
    .map((p) => p.pointsPerNight)
    .filter((n) => n > 0);
  return {
    type: "hotel",
    cash: (hotel.pricePerNight || 0) * nights,
    points: perNight.length ? Math.min(...perNight) * nights : 0,
    label: hotel.name,
  };
}

// Reduce a car to its { cash, points, label } — cash-only (no points).
function carItem(car, nights) {
  if (!car) return null;
  return {
    type: "car",
    cash: (car.pricePerDay || 0) * nights,
    points: 0,
    label: `${car.vendor} · ${car.carClass}`,
  };
}

function comboItems(flight, hotel, car, nights) {
  return [flightItem(flight), hotelItem(hotel, nights), carItem(car, nights)].filter(Boolean);
}

// Points the traveler can deploy toward awards (transferable balances).
const availablePoints = (loyaltyPoints) =>
  (loyaltyPoints?.amex || 0) + (loyaltyPoints?.chaseUr || 0);

// Award legs (points > 0), each tagged with its value v = cash saved per point,
// sorted best value first. Points are spent on the highest-value redemption
// first — so the marginal ¢/pt declines as more points are deployed.
function awardLegsByValue(items) {
  return items
    .filter((it) => it.points > 0)
    .map((it) => ({ ...it, v: it.cash / it.points }))
    .sort((a, b) => b.v - a.v);
}

// The most points worth deploying = the award total, capped by the balance.
// The slider ratio r ∈ [0,1] is the fraction of THIS that's deployed, so points
// used can never exceed the balance.
export function maxComboPoints(flight, hotel, car, loyaltyPoints, nights) {
  const award = comboItems(flight, hotel, car, nights).reduce(
    (sum, it) => sum + (it.points > 0 ? it.points : 0),
    0
  );
  return Math.min(award, availablePoints(loyaltyPoints));
}

// 1 when the combo has any award legs to deploy points against, else 0. The
// slider spans [0,1] = "no points" -> "all deployable points"; the per-balance
// cap is baked into maxComboPoints, so there's no separate upper clamp.
export function maxComboRatio(flight, hotel, car, loyaltyPoints, nights) {
  return maxComboPoints(flight, hotel, car, loyaltyPoints, nights) > 0 ? 1 : 0;
}

// Live totals at deployment ratio r. r·maxComboPoints points are spent greedily
// on the best-value award legs first; each leg's cash is covered pro-rata by the
// points put into it (savings += cash · pointsIntoLeg / legPoints). Cars (no
// points) are always cash. Because points fill best-value legs first, the
// average ¢/pt (savings ÷ points) varies with r — high at low r, lower at high r.
export function computeCombination(flight, hotel, car, loyaltyPoints, nights, ratio = 1) {
  const r = Math.max(0, Math.min(1, ratio));
  const items = comboItems(flight, hotel, car, nights);
  const fullCash = items.reduce((s, it) => s + it.cash, 0);

  let budgetPoints = r * maxComboPoints(flight, hotel, car, loyaltyPoints, nights);
  let pointsUsed = 0;
  let savingsAmount = 0;
  for (const leg of awardLegsByValue(items)) {
    if (budgetPoints <= 0) break;
    const spent = Math.min(leg.points, budgetPoints);
    savingsAmount += leg.cash * (spent / leg.points);
    pointsUsed += spent;
    budgetPoints -= spent;
  }

  const totalCash = fullCash - savingsAmount;
  const pointsValueCents = pointsUsed > 0 ? (savingsAmount / pointsUsed) * 100 : 0;
  return {
    items,
    hasSelection: items.length > 0,
    totalCash: Math.round(totalCash),
    pointsUsed: Math.round(pointsUsed),
    savingsAmount: Math.round(savingsAmount),
    fullCash: Math.round(fullCash),
    pointsValueCents,
  };
}

// --- Budget enforcement -----------------------------------------------------
// budget = the trip's total cash budget. Points are the lever that pulls cash
// down under it. Two derived quantities drive the UI:
//   minBudgetRatio  — the LEAST points needed to keep cash ≤ budget (slider's
//                     lower bound; below it the combo would blow the budget).
//   comboFitsBudget — can this combo stay within budget at the MOST points the
//                     balance can fund? If not, the option is infeasible (grey).

// Smallest ratio whose cash ≤ budget. We need savings ≥ fullCash − budget; walk
// the best-value legs accumulating savings until that target is met, then return
// the points spent as a fraction of maxComboPoints.
export function minBudgetRatio(flight, hotel, car, loyaltyPoints, nights, budget) {
  if (!budget) return 0;
  const items = comboItems(flight, hotel, car, nights);
  const fullCash = items.reduce((s, it) => s + it.cash, 0);
  const required = fullCash - budget; // savings needed to reach budget
  if (required <= 0) return 0;

  const maxPoints = maxComboPoints(flight, hotel, car, loyaltyPoints, nights);
  if (maxPoints <= 0) return 0; // no points to deploy (comboFitsBudget will be false)

  let pointsNeeded = 0;
  let savings = 0;
  let remaining = maxPoints;
  for (const leg of awardLegsByValue(items)) {
    if (savings >= required || remaining <= 0) break;
    const avail = Math.min(leg.points, remaining);
    const needWithinLeg = (required - savings) / leg.v;
    if (needWithinLeg <= avail) {
      pointsNeeded += needWithinLeg;
      savings = required;
      break;
    }
    pointsNeeded += avail;
    savings += avail * leg.v;
    remaining -= avail;
  }
  if (savings < required) return 1; // even max points can't fit (greyed elsewhere)
  return Math.min(1, pointsNeeded / maxPoints);
}

// True if the combo can be brought within budget using available points.
export function comboFitsBudget(flight, hotel, car, loyaltyPoints, nights, budget) {
  if (!budget) return true;
  return computeCombination(flight, hotel, car, loyaltyPoints, nights, 1).totalCash <= budget;
}
