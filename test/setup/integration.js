// test/setup/integration.js — Phase 23. Per-worker setup: ensure the test DATABASE_URL, mock every third
// party so nothing reaches a real API, and truncate the DB before each test. The mock implementations live
// in test/mocks/* (single source of truth); referenced here via lazy factories so vi.mock hoisting is safe.
import { beforeEach, afterAll, vi } from "vitest";
import { clerkMock } from "../mocks/clerk.js";
import { resendMock } from "../mocks/resend.js";
import { anthropicMock } from "../mocks/anthropic.js";

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://bonza:bonza_dev@localhost:5432/bonza_test";
process.env.NODE_ENV = "test";

// Clerk auth — a mutable getAuth so tests can switch the acting user (helpers/auth.js).
vi.mock("@clerk/express", () => clerkMock());

// Email — never send (shared sendSpy lets tests assert dispatch).
vi.mock("resend", () => resendMock());

// Anthropic — parseable JSON matching the prompt contract (prose would mask a parsing bug).
vi.mock("@anthropic-ai/sdk", () => anthropicMock());

const { resetDb, prisma } = require("./db");

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});
