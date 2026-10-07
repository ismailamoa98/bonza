// test/mocks/seatsAero.js — Phase 23. seatsAeroService mocks (award flight search + deep links).
// IMPORTANT: award availability is only ever what the feed returns — a mock must NEVER add availability
// the code didn't ask for. The empty variant is the default safety case; the down variant proves search
// degrades to cash-only rather than failing. Shape mirrors services/seatsAeroService.js.
// Usage (hoisting-safe): vi.mock("../../src/backend/services/seatsAeroService", () => seatsAeroDownMock())
import { vi } from "vitest";

export const awardResults = [
  {
    programme: "ba_avios",
    pointsCost: 26000,
    cashCostGbp: 55,
    cabin: "economy",
    seatsRemaining: 4,
    deepLink: "https://www.britishairways.com/travel/redeem",
    source: "seats.aero",
  },
];

export function seatsAeroMock(results = awardResults) {
  return {
    searchAwardFlights: vi.fn().mockResolvedValue(results),
    generateLoyaltyDeepLink: vi.fn(() => "https://www.britishairways.com/travel/redeem"),
    wrapWithAffiliate: vi.fn((url) => url),
  };
}

// Down variant — the award feed is unreachable; the search route must still return cash results.
export function seatsAeroDownMock(err = new Error("seats.aero 503")) {
  return {
    searchAwardFlights: vi.fn().mockRejectedValue(err),
    generateLoyaltyDeepLink: vi.fn(() => null),
    wrapWithAffiliate: vi.fn((url) => url),
  };
}

// No-availability variant — the honest default when nothing is bookable on points.
export function seatsAeroEmptyMock() {
  return seatsAeroMock([]);
}
