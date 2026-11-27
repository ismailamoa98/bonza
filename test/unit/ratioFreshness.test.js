// test/unit/ratioFreshness.test.js — Phase 27 §27e-7. A transfer ratio older than 24h must be excluded.
import { describe, it, expect } from "vitest";

const { isRatioFresh, ratioAgeHours, FRESH_RATIO_MS } = require("../../src/backend/services/ratioFreshness");

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);

describe("ratioFreshness", () => {
  it("accepts a ratio verified within 24h", () => {
    expect(isRatioFresh({ ratioFetchedAt: new Date(NOW - 2 * 3600_000) }, NOW)).toBe(true);
    expect(ratioAgeHours({ ratioFetchedAt: new Date(NOW - 2 * 3600_000) }, NOW)).toBe(2);
  });

  it("excludes a ratio older than 24h", () => {
    expect(isRatioFresh({ ratioFetchedAt: new Date(NOW - 25 * 3600_000) }, NOW)).toBe(false);
  });

  it("excludes a ratio that was never fetched (null)", () => {
    expect(isRatioFresh({ ratioFetchedAt: null }, NOW)).toBe(false);
    expect(ratioAgeHours({ ratioFetchedAt: null }, NOW)).toBeNull();
  });

  it("boundary: exactly 24h is stale", () => {
    expect(isRatioFresh({ ratioFetchedAt: new Date(NOW - FRESH_RATIO_MS) }, NOW)).toBe(false);
  });
});
