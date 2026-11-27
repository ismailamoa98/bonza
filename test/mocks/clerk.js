// test/mocks/clerk.js — Phase 23. The @clerk/express mock: a mutable getAuth so tests can switch the
// acting user via helpers/auth.js (asUser/asGuest). Never reaches Clerk's servers.
// Usage (hoisting-safe): vi.mock("@clerk/express", () => clerkMock())
import { vi } from "vitest";

export function clerkMock() {
  return {
    getAuth: vi.fn(() => ({ userId: null })),
    clerkMiddleware: () => (req, _res, next) => next(),
    requireAuth: () => (req, _res, next) => next(),
    clerkClient: {
      users: { getUser: vi.fn().mockRejectedValue(new Error("no clerk in tests")) },
    },
  };
}
