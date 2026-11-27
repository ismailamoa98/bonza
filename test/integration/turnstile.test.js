// test/integration/turnstile.test.js — Phase 27 §27d. The bot challenge on the two human entry points.
// Offline (no secret) verification is a no-op accept, so the public ticket form and the verify endpoint work
// without a token. With Turnstile enabled, a missing/invalid token is rejected (BOT_CHECK_FAILED / 400).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { asGuest } from "../helpers/auth.js";
import { makeUser } from "../factories/index.js";

const app = require("../../src/backend/server");
const env = require("../../src/backend/config/env");

// optionalAuth dev-falls-back to the seeded demo user, so the ticket's userId FK needs that row to exist.
const DEV_ID = "user_dev_demo";

const saved = { hasTurnstile: env.hasTurnstile, secret: env.TURNSTILE_SECRET_KEY };
afterEach(() => {
  env.hasTurnstile = saved.hasTurnstile;
  env.TURNSTILE_SECRET_KEY = saved.secret;
});

describe("Turnstile — offline (no secret)", () => {
  beforeEach(async () => {
    asGuest();
    env.hasTurnstile = false;
    await makeUser({ id: DEV_ID, email: "demo@bonza.app" });
  });

  it("verify endpoint accepts (skipped)", async () => {
    const res = await request(app).post("/api/v1/security/turnstile/verify").send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, skipped: true });
  });

  it("creates a support ticket without a token", async () => {
    const res = await request(app)
      .post("/api/v1/support/tickets")
      .send({ email: "t@example.com", subject: "Help", message: "Something's up", urgency: "general" });
    expect(res.status).toBe(201);
    expect(res.body.reference).toMatch(/^BZ-/);
  });
});

describe("Turnstile — enabled", () => {
  beforeEach(() => {
    asGuest();
    env.hasTurnstile = true;
    env.TURNSTILE_SECRET_KEY = "test-secret";
  });

  it("rejects a ticket with no / unverifiable token (BOT_CHECK_FAILED)", async () => {
    const res = await request(app)
      .post("/api/v1/support/tickets")
      .send({ email: "t@example.com", subject: "Help", message: "Something's up", urgency: "general" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("BOT_CHECK_FAILED");
  });

  it("verify endpoint returns ok:false for a missing token", async () => {
    const res = await request(app).post("/api/v1/security/turnstile/verify").send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});
