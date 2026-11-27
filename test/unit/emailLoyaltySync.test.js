// test/unit/emailLoyaltySync.test.js — Phase 23. The statement balance parser. extractBalance must survive
// promo clutter, parse un-grouped numbers (the 124000→0 regression), and report which programmes can be
// verified by email at all (honesty rule: banks/cards are manual, never shown as email-verified).
import { describe, it, expect } from "vitest";

const { extractBalance, EMAIL_VERIFIABLE, PROGRAMME_PATTERNS } = require("../../src/backend/services/emailLoyaltySync");

describe("extractBalance", () => {
  // §27c — extractBalance now returns { balance, confidence, matchedPattern } (or null).
  it("parses a comma-grouped balance near the balance context (high confidence)", () => {
    const r = extractBalance("Your current balance is 124,000 points", { balanceUnit: "points|pts" });
    expect(r.balance).toBe(124000);
    expect(r.matchedPattern).toBe("context_before");
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  // Regression — an un-grouped number ("124000 points") must parse to 124000, not collapse to 0.
  it("parses an un-grouped balance (124000 regression)", () => {
    expect(extractBalance("You have 124000 points available", {}).balance).toBe(124000);
  });

  // Promo-proof — a "5,000 bonus points" line must not win over the real balance.
  it("prefers the balance-context number over a promotional number", () => {
    const body = "Earn 5,000 bonus points this month! Your balance: 88,000 points.";
    expect(extractBalance(body, { balanceUnit: "points|pts" }).balance).toBe(88000);
  });

  it("honours a programme's balanceUnit (miles)", () => {
    expect(extractBalance("Your MileagePlus balance: 60,000 miles", { balanceUnit: "miles" }).balance).toBe(60000);
  });

  it("uses a programme's own patterns end-to-end (Avios)", () => {
    expect(extractBalance("Your Executive Club: 42,500 Avios", PROGRAMME_PATTERNS.ba_avios).balance).toBe(42500);
  });

  // A bare number+unit with no balance context is a lower-confidence read (the guard may quarantine it).
  it("reports a lower confidence for a loose match with no balance context", () => {
    const r = extractBalance("42,500 points", { balanceUnit: "points|pts" });
    expect(r.balance).toBe(42500);
    expect(r.matchedPattern).toBe("loose_unit");
    expect(r.confidence).toBeLessThan(0.9);
  });

  it("returns null when there is no balance to find", () => {
    expect(extractBalance("No numbers in this email at all.", {})).toBeNull();
    expect(extractBalance("", {})).toBeNull();
  });
});

describe("EMAIL_VERIFIABLE", () => {
  it("includes hotels and major airlines", () => {
    for (const p of ["marriott_bonvoy", "hilton_honors", "world_of_hyatt", "ihg_one", "united_mp", "ba_avios"]) {
      expect(EMAIL_VERIFIABLE.has(p)).toBe(true);
    }
  });

  it("excludes banks/cards (manual only — never shown as email-verified)", () => {
    expect(EMAIL_VERIFIABLE.has("amex_mr")).toBe(false);
    expect(EMAIL_VERIFIABLE.has("chase_ur")).toBe(false);
  });
});
