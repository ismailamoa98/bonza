// test/integration/requestId.test.js — Phase 27 §27i. The correlation-id middleware on real requests: an
// id is minted when absent, a sane inbound id is honoured, a malformed one is rejected and replaced, and the
// id survives the error path (it's on the response of a 404 too).
import { describe, it, expect } from "vitest";
import request from "supertest";

const app = require("../../src/backend/server");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("x-request-id correlation middleware (§27i)", () => {
  it("mints a UUID when the client sends no id", async () => {
    const res = await request(app).get("/api/v1/status");
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toMatch(UUID);
  });

  it("honours a sane inbound x-request-id (echoes it back)", async () => {
    const res = await request(app).get("/api/v1/status").set("x-request-id", "trace-abc_123");
    expect(res.headers["x-request-id"]).toBe("trace-abc_123");
  });

  it("rejects a malformed inbound id and mints its own", async () => {
    const res = await request(app).get("/api/v1/status").set("x-request-id", "not a valid id!!");
    expect(res.headers["x-request-id"]).not.toBe("not a valid id!!");
    expect(res.headers["x-request-id"]).toMatch(UUID);
  });

  it("carries the id through the error path (404 still has the header)", async () => {
    const res = await request(app).get("/api/v1/definitely-not-a-route").set("x-request-id", "trace-err-1");
    expect(res.status).toBe(404);
    expect(res.headers["x-request-id"]).toBe("trace-err-1");
  });
});
