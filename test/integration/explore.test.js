// test/integration/explore.test.js — Phase 23. The public Explore endpoints (optionalAuth). Smoke-level:
// they must be reachable unauthenticated, return the documented envelope, and 404 cleanly on unknown ids —
// without 500ing on an empty dataset. (Rich pricing is seeded data; covered where seeded / in E2E.)
import { describe, it, expect } from "vitest";
import request from "supertest";

const app = require("../../src/backend/server");

describe("GET /explore", () => {
  it("is reachable unauthenticated and returns the map/list envelope", async () => {
    const res = await request(app).get("/api/v1/explore");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.countries)).toBe(true);
    expect(res.body).toHaveProperty("origin");
    expect(res.body).toHaveProperty("total");
  });

  it("accepts an origin override", async () => {
    const res = await request(app).get("/api/v1/explore").query({ origin: "MAN" });
    expect(res.status).toBe(200);
  });
});

describe("GET /explore/city/:cityId", () => {
  it("404s for an unknown city id", async () => {
    const res = await request(app).get("/api/v1/explore/city/does_not_exist");
    expect(res.status).toBe(404);
  });
});

describe("GET /explore/:code", () => {
  it("404s for an unknown country code", async () => {
    const res = await request(app).get("/api/v1/explore/ZZ");
    expect(res.status).toBe(404);
  });
});
