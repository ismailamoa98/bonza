// test/integration/rateLimit.test.js — Phase 27 §27d. The rate limiters are backed by the shared Postgres
// store (RateLimitHit), so a limit is real and survives across requests (and, in prod, across instances).
// We exercise the cheapest low-max limiter — the onboarding limiter (max 3, only counts onboardingComplete
// flips) — past its ceiling and assert the 4th request is 429 and the shared counter row exists.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { asGuest } from "../helpers/auth.js";
import { makeUser, prisma } from "../factories/index.js";

const app = require("../../src/backend/server");
const { PrismaRateLimitStore } = require("../../src/backend/utils/rateLimitStore");

const DEV_ID = "user_dev_demo";

describe("rate limiting (shared Postgres store)", () => {
  beforeEach(async () => {
    asGuest(); // dev-fallback user
    await makeUser({ id: DEV_ID, email: "demo@bonza.app" });
  });

  it("enforces a limiter across requests and 429s past the max", async () => {
    const hit = () => request(app).patch("/api/v1/user/profile").send({ onboardingComplete: true });
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await hit()).status); // max is 3/hour

    expect(codes.slice(0, 3).every((c) => c === 200)).toBe(true);
    expect(codes[3]).toBe(429);

    // the shared counter persisted (prefix "onboarding")
    const rows = await prisma.rateLimitHit.findMany({ where: { key: { startsWith: "onboarding:" } } });
    expect(rows.length).toBe(1);
    expect(rows[0].count).toBeGreaterThanOrEqual(4);
  });

  it("does not count requests the limiter skips (non-onboarding profile patches)", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app).patch("/api/v1/user/profile").send({ homeAirport: "LHR" });
      expect(res.status).toBe(200);
    }
    const rows = await prisma.rateLimitHit.findMany({ where: { key: { startsWith: "onboarding:" } } });
    expect(rows.length).toBe(0);
  });
});

describe("PrismaRateLimitStore", () => {
  it("increments within a window and resets when the window expires", async () => {
    const store = new PrismaRateLimitStore({ prefix: "unit_test" });
    store.init({ windowMs: 60_000 });

    const a = await store.increment("k1");
    const b = await store.increment("k1");
    expect(a.totalHits).toBe(1);
    expect(b.totalHits).toBe(2);

    // force the window into the past, then the next increment resets to 1
    await prisma.rateLimitHit.update({ where: { key: "unit_test:k1" }, data: { resetAt: new Date(Date.now() - 1000) } });
    const c = await store.increment("k1");
    expect(c.totalHits).toBe(1);

    await store.resetKey("k1");
    expect(await prisma.rateLimitHit.findUnique({ where: { key: "unit_test:k1" } })).toBeNull();
  });
});
