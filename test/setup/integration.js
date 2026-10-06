// test/setup/integration.js — Phase 23. Per-worker setup: ensure the test DATABASE_URL, mock every third party
// so nothing reaches a real API, and truncate the DB before each test.
import { beforeEach, afterAll, vi } from "vitest";

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://bonza:bonza_dev@localhost:5432/bonza_test";
process.env.NODE_ENV = "test";

// Clerk auth — a mutable getAuth so tests can switch the acting user (helpers/auth.js).
vi.mock("@clerk/express", () => ({
  getAuth: vi.fn(() => ({ userId: null })),
  clerkMiddleware: () => (req, _res, next) => next(),
  requireAuth: () => (req, _res, next) => next(),
  clerkClient: { users: { getUser: vi.fn().mockRejectedValue(new Error("no clerk in tests")) } },
}));

// Email — never send.
vi.mock("resend", () => ({ Resend: vi.fn(() => ({ emails: { send: vi.fn().mockResolvedValue({ data: { id: "re_test" } }) } })) }));


// Anthropic — parseable JSON matching the prompt contract (prose would mask a parsing bug).
vi.mock("@anthropic-ai/sdk", () => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify([{ destination: "LIS", destinationCity: "Lisbon", origin: "LHR", specLine: "5 NTS", rating: 8.4, bestOptionType: "points" }]) }],
  });
  return { default: vi.fn(() => ({ messages: { create }, beta: { messages: { create } } })) };
});

const { resetDb, prisma } = require("./db");

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});
