// test/integration/errorContract.test.js — Phase 24 §24h. Every 4xx/5xx from Express is the fixed shape
// { error: { code, message, retryable, service } }. Forcing a real failure on all 35 mounts isn't
// mechanical, so this walks a representative set across the status codes + the notFound handler.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { makeUser, makeBooking, prisma } from "../factories/index.js";

const app = require("../../src/backend/server");

function expectContract(res, { status, code, retryable }) {
  expect(res.status).toBe(status);
  const e = res.body.error;
  expect(e, JSON.stringify(res.body)).toBeTypeOf("object");
  expect(Object.keys(e).sort()).toEqual(["code", "message", "retryable", "service"]);
  expect(e.code).toBe(code);
  expect(typeof e.message).toBe("string");
  expect(e.retryable).toBe(retryable);
  expect(e.service === null || typeof e.service === "string").toBe(true);
}

describe("API error contract (§24h)", () => {
  it("404 — unknown route (notFound handler)", async () => {
    expectContract(await request(app).get("/api/v1/definitely-not-a-route"), { status: 404, code: "NOT_FOUND", retryable: false });
  });

  it("404 — unknown country on /explore/:code", async () => {
    expectContract(await request(app).get("/api/v1/explore/ZZ"), { status: 404, code: "NOT_FOUND", retryable: false });
  });

  it("404 — unknown explore city id", async () => {
    expectContract(await request(app).get("/api/v1/explore/city/nope"), { status: 404, code: "NOT_FOUND", retryable: false });
  });

  it("403 — another user's booking (IDOR)", async () => {
    const alice = await makeUser();
    const booking = await makeBooking(alice.id, { leg: "hotel" });
    expectContract(await request(app).get(`/api/v1/bookings/${booking.id}`), { status: 403, code: "FORBIDDEN", retryable: false });
  });

  it("403 — support ticket without the raising email", async () => {
    const alice = await makeUser();
    await prisma.supportTicket.create({ data: { reference: "BZ-CONTRACT", userId: alice.id, email: alice.email, urgency: "general", category: "booking", subject: "x", message: "y", slaTarget: new Date() } });
    expectContract(await request(app).get("/api/v1/support/tickets/BZ-CONTRACT"), { status: 403, code: "FORBIDDEN", retryable: false });
  });
});
