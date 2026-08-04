// store/appStore.js — Zustand store: trip, scenarios, chat, loyalty, auth sync.
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

  activeTab: "hotels", // "hotels" | "flights" | "cars"
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

export const VENDOR_CATEGORIES = [
  ["flight", "flightDetails"],
  ["hotel", "hotelDetails"],
  ["car", "carDetails"],
];

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

export const useAppStore = create((set) => ({
  ...initialState,

  user: null, // { id, name, email } | null
  isLoggedIn: false,
  setUser: (user) => set({ user, isLoggedIn: Boolean(user) }),
  logout: () =>
    set({
      user: null,
      isLoggedIn: false,
      loyaltyPoints: null,
      currentPackage: null,
      isPro: false,
      creditBalance: 0,
      loyaltyAccounts: [],
      profile: null,
    }),

  isPro: false,
  creditBalance: 0, // GBP, redeemable Bonza Credits
  loyaltyAccounts: [], // [{ programme, balance, valueGbp, statusTier, … }]
  setProStatus: (isPro) => set({ isPro: Boolean(isPro) }),
  setCreditBalance: (creditBalance) => set({ creditBalance: Number(creditBalance) || 0 }),
  setLoyaltyAccounts: (loyaltyAccounts) => set({ loyaltyAccounts: loyaltyAccounts || [] }),

  profile: null, // { homeAirport, travelStyle, onboardingComplete, gmailConnected, outlookConnected } | null
  setProfile: (profile) => set({ profile: profile || null }),

  setTrip: (trip) => set({ trip }),
  setTripId: (tripId) => set({ tripId }),
  setLoyaltyPoints: (loyaltyPoints) => set({ loyaltyPoints }),
  setCurrentPackage: (currentPackage) => set({ currentPackage }),

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

  setActiveTab: (activeTab) => set({ activeTab }),
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

export const selectSelectedScenario = (state) =>
  state.scenarios.find((s) => s.id === state.selectedScenarioId) || null;

export function getVendor(scenario, category, selection) {
  const key = VENDOR_CATEGORIES.find(([c]) => c === category)?.[1];
  const details = scenario?.[key] || {};
  const vendors = details.vendors || [];
  const id = selection?.[category] || details.selectedVendorId;
  return vendors.find((v) => v.id === id) || vendors.find((v) => v.recommended) || vendors[0] || null;
}

function cashOptionPrice(scenario, category, fallback) {
  const key = VENDOR_CATEGORIES.find(([c]) => c === category)?.[1];
  const vendors = scenario?.[key]?.vendors || [];
  const cashVendor = vendors.find((v) => v.pointsCost === 0);
  return cashVendor ? cashVendor.cashCost : fallback;
}

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
  const pointsValueCents = pointsUsed > 0 ? (savingsAmount / pointsUsed) * 100 : 0;
  return {
    totalCash: Math.round(totalCash),
    pointsUsed: Math.round(pointsUsed),
    savingsAmount: Math.round(savingsAmount),
    pointsValueCents,
    benefits: [...new Set(benefits)],
  };
}

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

export function selectedVendorObjects(scenario, selection) {
  const out = {};
  for (const [cat] of VENDOR_CATEGORIES) out[cat] = getVendor(scenario, cat, selection);
  return out;
}

export function tripNights(trip) {
  if (!trip?.checkIn || !trip?.checkOut) return 1;
  const nights = Math.round((new Date(trip.checkOut) - new Date(trip.checkIn)) / 86400000);
  return nights > 0 ? nights : 1;
}

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

const availablePoints = (loyaltyPoints) =>
  (loyaltyPoints?.amex || 0) + (loyaltyPoints?.chaseUr || 0);

function awardLegsByValue(items) {
  return items
    .filter((it) => it.points > 0)
    .map((it) => ({ ...it, v: it.cash / it.points }))
    .sort((a, b) => b.v - a.v);
}

export function maxComboPoints(flight, hotel, car, loyaltyPoints, nights) {
  const award = comboItems(flight, hotel, car, nights).reduce(
    (sum, it) => sum + (it.points > 0 ? it.points : 0),
    0
  );
  return Math.min(award, availablePoints(loyaltyPoints));
}

export function maxComboRatio(flight, hotel, car, loyaltyPoints, nights) {
  return maxComboPoints(flight, hotel, car, loyaltyPoints, nights) > 0 ? 1 : 0;
}

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

export function comboFitsBudget(flight, hotel, car, loyaltyPoints, nights, budget) {
  if (!budget) return true;
  return computeCombination(flight, hotel, car, loyaltyPoints, nights, 1).totalCash <= budget;
}
