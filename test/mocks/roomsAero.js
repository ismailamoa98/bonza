// test/mocks/roomsAero.js — Phase 23. roomsAeroService mocks (hotel award search).
// Shape mirrors services/roomsAeroService.js ({ searchHotelAwards, hasRoomsAero }).
// Usage (hoisting-safe): vi.mock("../../src/backend/services/roomsAeroService", () => roomsAeroDownMock())
import { vi } from "vitest";

export const hotelAwards = [
  { programme: "world_of_hyatt", propertyName: "Hyatt Regency Lisbon", pointsPerNight: 12000, cashPerNight: 0, starRating: 5 },
];

export function roomsAeroMock(results = hotelAwards) {
  return {
    searchHotelAwards: vi.fn().mockResolvedValue(results),
    hasRoomsAero: vi.fn(() => false),
  };
}

export function roomsAeroDownMock(err = new Error("rooms.aero 503")) {
  return {
    searchHotelAwards: vi.fn().mockRejectedValue(err),
    hasRoomsAero: vi.fn(() => true),
  };
}

export function roomsAeroEmptyMock() {
  return roomsAeroMock([]);
}
