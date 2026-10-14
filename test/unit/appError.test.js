// test/unit/appError.test.js — Phase 24 §24h. The typed error + its serialized shape. Every error body is
// { error: { code, message, retryable, service } }.
import { describe, it, expect, vi } from "vitest";

const { AppError, serialize, sendError, CODES } = require("../../src/backend/utils/AppError");

describe("AppError", () => {
  it("fills status/message/retryable/service from the code defaults", () => {
    const e = new AppError("AWARD_SEARCH_UNAVAILABLE");
    expect(e.status).toBe(503);
    expect(e.code).toBe("AWARD_SEARCH_UNAVAILABLE");
    expect(e.retryable).toBe(true);
    expect(e.service).toBe("seats_aero");
    expect(e.message).toMatch(/award space/i);
  });

  it("maps an unknown code to INTERNAL", () => {
    const e = new AppError("NOPE");
    expect(e.code).toBe("INTERNAL");
    expect(e.status).toBe(500);
  });

  it("honours overrides", () => {
    const e = new AppError("VALIDATION_FAILED", { message: "dates required", status: 422, service: "internal" });
    expect(e.message).toBe("dates required");
    expect(e.status).toBe(422);
    expect(e.service).toBe("internal");
    expect(e.retryable).toBe(false);
  });

  it("every code defines a status and a message", () => {
    for (const [code, def] of Object.entries(CODES)) {
      expect(typeof def.status, code).toBe("number");
      expect(typeof def.message, code).toBe("string");
    }
  });
});

describe("serialize", () => {
  it("produces the fixed contract shape", () => {
    expect(serialize(new AppError("NOT_FOUND"))).toEqual({
      error: { code: "NOT_FOUND", message: expect.any(String), retryable: false, service: null },
    });
  });
});

describe("sendError", () => {
  it("writes status + the contract body to res", () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    sendError(res, "RATE_LIMITED");
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: { code: "RATE_LIMITED", message: expect.any(String), retryable: true, service: null } });
  });
});
