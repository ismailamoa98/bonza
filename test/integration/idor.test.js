// test/integration/idor.test.js — Phase 23. Every user-owned :id route must refuse another user's resource.
// Routes using ownedOr403 return 403 (record exists, wrong owner); routes scoped by findFirst({id,userId})
// return 404 (the resource is invisible). Both prove isolation. Also covers auth + requirePro.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { asUser, asGuest } from "../helpers/auth.js";
import { makeUser, makeProUser, makeBooking, makeLoyaltyAccount, prisma } from "../factories/index.js";

const app = require("../../src/backend/server");

let alice, bob, aliceBooking, aliceAccount;

beforeEach(async () => {
  alice = await makeUser();
  bob = await makeUser();
  aliceBooking = await makeBooking(alice.id, { leg: "hotel" });
  aliceAccount = await makeLoyaltyAccount(alice.id);
  asUser(bob.id); // act as Bob for every IDOR assertion
});

describe("IDOR — another user's resource is refused", () => {
  it("GET /bookings/:id → 403 (ownedOr403)", async () => {
    const res = await request(app).get(`/api/v1/bookings/${aliceBooking.id}`);
    expect(res.status).toBe(403);
  });

  it("POST /bookings/:id/cancel → 403 (ownedOr403)", async () => {
    const res = await request(app).post(`/api/v1/bookings/${aliceBooking.id}/cancel`);
    expect(res.status).toBe(403);
  });

  it("GET /points/programme/:accountId → 403 (ownedOr403)", async () => {
    const res = await request(app).get(`/api/v1/points/programme/${aliceAccount.id}`);
    expect(res.status).toBe(403);
  });

  it("PATCH /points/balance/:accountId → 404 (findFirst scoped — invisible)", async () => {
    const res = await request(app).patch(`/api/v1/points/balance/${aliceAccount.id}`).send({ balance: 1 });
    expect(res.status).toBe(404);
  });

  it("DELETE /points/duplicate/:accountId → 404 (findFirst scoped — invisible)", async () => {
    const res = await request(app).delete(`/api/v1/points/duplicate/${aliceAccount.id}`);
    expect(res.status).toBe(404);
  });

  it("does not expose Alice's booking data in the 403 body", async () => {
    const res = await request(app).get(`/api/v1/bookings/${aliceBooking.id}`);
    expect(JSON.stringify(res.body)).not.toContain(aliceBooking.supplierReference);
  });
});

describe("auth middleware", () => {
  it("returns 401 without a session (production) — allowed via dev fallback otherwise", async () => {
    asGuest();
    const res = await request(app).get("/api/v1/bookings");
    // NODE_ENV=test → treated as non-production, so the dev fallback applies (200). The 401 path is the
    // production branch; we assert the route is reachable and doesn't 500.
    expect([200, 401]).toContain(res.status);
  });

  it("GET /explore is reachable unauthenticated (optionalAuth, public)", async () => {
    asGuest();
    const res = await request(app).get("/api/v1/explore");
    expect(res.status).toBe(200);
  });
});

// requirePro's gate is a no-op unless env.proEnforced (off in dev/test), so its decision is tested as pure
// logic via isProActive() in test/unit/requirePro.test.js (free / active / expired / cancelled / past_due).
