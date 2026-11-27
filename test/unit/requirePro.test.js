// test/unit/requirePro.test.js — Phase 23. Pure logic: isProActive across subscriber states (no DB, no route).
import { describe, it, expect } from "vitest";

const { isProActive } = require("../../src/backend/middleware/requirePro");

const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);

describe("isProActive", () => {
  it("is false for a free user (no subscription)", () => {
    expect(isProActive(null)).toBe(false);
  });

  it("is true for an active subscription within the period", () => {
    expect(isProActive({ status: "active", currentPeriodEnd: future })).toBe(true);
  });

  it("is true for an active subscription with no period end", () => {
    expect(isProActive({ status: "active", currentPeriodEnd: null })).toBe(true);
  });

  it("is false for an active subscription past the period end", () => {
    expect(isProActive({ status: "active", currentPeriodEnd: past })).toBe(false);
  });

  it("is true for trialing within the period", () => {
    expect(isProActive({ status: "trialing", currentPeriodEnd: future })).toBe(true);
  });

  it("grants a cancelled subscription until the period end", () => {
    expect(isProActive({ status: "cancelled", currentPeriodEnd: future })).toBe(true);
    expect(isProActive({ status: "cancelled", currentPeriodEnd: past })).toBe(false);
  });

  it("is false for past_due", () => {
    expect(isProActive({ status: "past_due", currentPeriodEnd: future })).toBe(false);
  });
});
