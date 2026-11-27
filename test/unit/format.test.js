// test/unit/format.test.js — Phase 27 §27b. The one money/points formatter. Rounding is half-up to the
// currency's minor unit and must be exact (no float drift); formatMoney/formatPoints are the only renderers.
import { describe, it, expect } from "vitest";

const { roundHalfUpToMinor, toMinor, fromMinor, formatMoney, formatPoints, minorDigits } = require("../../src/shared/format");

describe("roundHalfUpToMinor", () => {
  // major amount → integer pence
  const cases = [
    [0.01, 1],
    [0.33, 33],
    [16.5, 1650],
    [24, 2400],
    [24.005, 2401], // half rounds up
    [0.005, 1], // half rounds up at the edge
    [-0.005, -1], // symmetric half-away-from-zero (JS Math.round(-0.5) would give -0)
    [-16.5, -1650],
    [1.005, 101], // classic float-representation trap (1.005*100 = 100.4999…) — still rounds to 101
    [0, 0],
  ];
  it.each(cases)("£%s → %i pence", (major, pence) => {
    expect(roundHalfUpToMinor(major, "GBP")).toBe(pence);
  });

  it("respects a zero-minor-digit currency (JPY)", () => {
    expect(roundHalfUpToMinor(1900, "JPY")).toBe(1900);
    expect(roundHalfUpToMinor(1900.4, "JPY")).toBe(1900);
    expect(roundHalfUpToMinor(1900.5, "JPY")).toBe(1901);
  });

  it("3% cashback on £400 is exactly 1200 pence, no drift", () => {
    expect(roundHalfUpToMinor(400 * 0.03, "GBP")).toBe(1200);
  });
});

describe("toMinor / fromMinor round-trip", () => {
  it("is lossless for representable amounts", () => {
    for (const major of [0, 0.01, 0.33, 16.5, 24, 999.99]) {
      expect(fromMinor(toMinor(major, "GBP"), "GBP")).toBeCloseTo(major, 10);
    }
  });
  it("minorDigits defaults to 2 for unknown currencies", () => {
    expect(minorDigits("GBP")).toBe(2);
    expect(minorDigits("JPY")).toBe(0);
    expect(minorDigits("XYZ")).toBe(2);
  });
});

describe("formatMoney", () => {
  it("formats pence in its own currency with natural minor digits", () => {
    expect(formatMoney(2400, "GBP")).toBe("£24.00");
    expect(formatMoney(2450, "GBP")).toBe("£24.50");
    expect(formatMoney(0, "GBP")).toBe("£0.00");
  });
  it("honours a maximumFractionDigits override (whole-pound style)", () => {
    expect(formatMoney(2400, "GBP", { maximumFractionDigits: 0 })).toBe("£24");
  });
  it("handles a zero-minor-digit currency (no decimals, JPY minor == major)", () => {
    const out = formatMoney(1900, "JPY", { locale: "en-GB" });
    expect(out).toMatch(/1,900/); // grouped thousands
    expect(out).not.toMatch(/\./); // no minor-unit decimals for JPY
    expect(out).toMatch(/¥/); // a yen sign (en-GB renders "JP¥")
  });
  it("never throws on bad input", () => {
    expect(() => formatMoney(undefined)).not.toThrow();
    expect(() => formatMoney(null, "ZZZ")).not.toThrow();
  });
});

describe("formatPoints", () => {
  it("groups thousands", () => {
    expect(formatPoints(124000, { locale: "en-GB" })).toBe("124,000");
    expect(formatPoints(0)).toBe("0");
  });
});
