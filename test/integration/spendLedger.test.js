// test/integration/spendLedger.test.js — Phase 27 §27d. The global per-service daily budget: interactive
// callers are capped below the full budget so the reserved slice stays for nightly jobs; exhaustion makes the
// real outbound branch serve mock instead of calling out. Budgets are mutated on the shared env object for the
// test (restored after) so we can exercise tiny ceilings without 5000 iterations.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "../factories/index.js";

const env = require("../../src/backend/config/env");
const spend = require("../../src/backend/services/spendLedger");
const seats = require("../../src/backend/services/seatsAeroService");

const savedBudgets = { ...env.SPEND_BUDGETS };
const savedReserve = env.SPEND_RESERVE_FRACTION;
const savedSeats = env.hasSeatsAero;

afterEach(() => {
  Object.assign(env.SPEND_BUDGETS, savedBudgets);
  env.SPEND_RESERVE_FRACTION = savedReserve;
  env.hasSeatsAero = savedSeats;
});

describe("spendLedger.tryConsume", () => {
  beforeEach(() => {
    env.SPEND_RESERVE_FRACTION = 0.15; // interactive ceiling = floor(budget * 0.85)
  });

  it("increments per (service, UTC date) and caps interactive below the full budget", async () => {
    env.SPEND_BUDGETS.claude = 2; // interactive ceiling = floor(2 * 0.85) = 1; reserved ceiling = 2

    const a = await spend.tryConsume("claude"); // interactive #1
    expect(a.allowed).toBe(true);
    expect(a.count).toBe(1);

    const b = await spend.tryConsume("claude"); // interactive #2 — over the reserved line
    expect(b.allowed).toBe(false);

    const c = await spend.tryConsume("claude", { reserved: true }); // nightly job draws on the reserved slice
    expect(c.allowed).toBe(true);
    expect(c.count).toBe(2);

    const d = await spend.tryConsume("claude", { reserved: true }); // now the full budget is spent
    expect(d.allowed).toBe(false);

    const [today] = await spend.spendToday();
    expect(today).toMatchObject({ service: "claude", count: 2 });
  });

  it("denies immediately when the reservation leaves no interactive share (ceiling < 1)", async () => {
    env.SPEND_BUDGETS.claude = 1; // interactive ceiling = floor(1 * 0.85) = 0
    const r = await spend.tryConsume("claude");
    expect(r.allowed).toBe(false);
    // nothing was written (no row seeded past the ceiling)
    expect(await prisma.spendLedger.findMany({ where: { service: "claude" } })).toHaveLength(0);
  });

  it("an unconfigured service is never gated", async () => {
    delete env.SPEND_BUDGETS.claude;
    const r = await spend.tryConsume("claude");
    expect(r.allowed).toBe(true);
  });
});

describe("real outbound branch honours the budget", () => {
  it("serves mock award flights when the Seats.aero interactive budget is exhausted", async () => {
    env.hasSeatsAero = true; // pretend a real key is present
    env.SPEND_BUDGETS.seats_aero = 1; // interactive ceiling 0 → every interactive call denied → mock
    env.SPEND_RESERVE_FRACTION = 0.15;

    // Would otherwise hit the real Seats.aero API; the budget denial makes it return the deterministic mock.
    const awards = await seats.searchAwardFlights({ origin: "LHR", destination: "JFK", cabin: "business" });
    expect(Array.isArray(awards)).toBe(true);
    expect(awards.length).toBeGreaterThan(0);
    expect(awards[0]).toHaveProperty("programme");
  });
});
