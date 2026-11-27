// test/mocks/duffel.js — Phase 23. Faithful duffelService mocks. The service already falls back to
// deterministic offline mocks when DUFFEL_API_KEY is absent (how most integration tests get data); these
// are for tests that need a SPECIFIC behaviour — a failure, an empty result, or a pinned payload. Shapes
// mirror services/duffelService.js (searchFlights/confirmFlightPrice/bookFlight/bookCashFlight/searchHotels).
// Usage (hoisting-safe): vi.mock("../../src/backend/services/duffelService", () => duffelDownMock())
import { vi } from "vitest";

export const flightOffers = [
  {
    id: "off_test_cheap",
    totalAmount: 240,
    currency: "GBP",
    slices: [{ duration: 115, segments: [{ carrier: "BA", origin: "LHR", destination: "JTR" }] }],
  },
  {
    id: "off_test_mid",
    totalAmount: 380,
    currency: "GBP",
    slices: [{ duration: 240, segments: [{ carrier: "AF" }, { carrier: "AF" }] }],
  },
];

export const hotelResults = [
  { duffelHotelId: "hot_test_1", name: "Istoria", lowestRate: 384, currency: "GBP", starRating: 5 },
];

export const order = { id: "ord_test_1", bookingReference: "ABC123", totalAmount: 240 };

export function duffelMock(overrides = {}) {
  return {
    searchFlights: vi.fn().mockResolvedValue(flightOffers),
    confirmFlightPrice: vi.fn().mockResolvedValue({ id: "off_test_cheap", totalAmount: 240 }),
    bookFlight: vi.fn().mockResolvedValue(order),
    bookCashFlight: vi.fn().mockResolvedValue(order),
    searchHotels: vi.fn().mockResolvedValue(hotelResults),
    cancelOrder: vi.fn().mockResolvedValue({ id: "ord_test_1", status: "cancelled" }),
    ...overrides,
  };
}

// Failure variant — the carrier search times out. The route must surface a typed error, not a 500.
export function duffelDownMock(err = new Error("duffel timeout")) {
  return duffelMock({
    searchFlights: vi.fn().mockRejectedValue(err),
    searchHotels: vi.fn().mockRejectedValue(err),
  });
}

// Empty-result variant — no flights returned.
export function duffelEmptyMock() {
  return duffelMock({ searchFlights: vi.fn().mockResolvedValue([]) });
}
