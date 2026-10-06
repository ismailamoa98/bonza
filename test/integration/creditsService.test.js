// test/integration/creditsService.test.js — Phase 23. The credit ledger: regression cover for the known bugs
// plus the cashback award rules. getCreditBalance returns { totalCreditsGbp, credits }.
import { describe, it, expect, afterEach, vi } from "vitest";
import { makeUser, makeProUser, makeBooking, makeCredit, prisma } from "../factories/index.js";

const { awardCashback, getCreditBalance, redeemCredits } = require("../../src/backend/services/creditsService");
const { cashbackRateFor } = require("../../src/backend/config/constants");

const bal = async (userId) => (await getCreditBalance(userId)).totalCreditsGbp;

afterEach(() => vi.useRealTimers());

describe("getCreditBalance", () => {
  it("sums earned rows that have not expired", async () => {
    const u = await makeUser();
    await makeCredit(u.id, { amount: 10 });
    await makeCredit(u.id, { amount: 15 });
    expect(await bal(u.id)).toBe(25);
  });

  // Regression — redeemed rows must reduce the balance.
  it("subtracts redeemed rows from the balance", async () => {
    const u = await makeUser();
    await makeCredit(u.id, { amount: 50, source: "cashback_hotel" });
    await makeCredit(u.id, { amount: -20, source: "redeemed", expiresAt: new Date("9999-12-31") });
    expect(await bal(u.id)).toBe(30);
  });

  // Regression — a redemption must not expire and restore a spent balance.
  it("does not let a redemption expire and restore the balance", async () => {
    const u = await makeUser();
    await makeCredit(u.id, { amount: 50, source: "cashback_hotel", expiresAt: new Date("9999-12-31") });
    await makeCredit(u.id, { amount: -20, source: "redeemed", expiresAt: new Date("9999-12-31") });
    vi.setSystemTime(new Date(Date.now() + 48 * 3600000));
    expect(await bal(u.id)).toBe(30);
  });

  // Regression — balance is clamped at zero; an expiring earned row can't drive it negative.
  it("never returns a negative balance when earned rows expire", async () => {
    const u = await makeUser();
    await makeCredit(u.id, { amount: 10, source: "cashback_hotel", expiresAt: new Date(Date.now() - 1000) });
    await makeCredit(u.id, { amount: -20, source: "redeemed", expiresAt: new Date("9999-12-31") });
    expect(await bal(u.id)).toBe(0);
  });

  it("excludes rows past their expiry", async () => {
    const u = await makeUser();
    await makeCredit(u.id, { amount: 10, expiresAt: new Date(Date.now() - 1000) });
    await makeCredit(u.id, { amount: 5 });
    expect(await bal(u.id)).toBe(5);
  });

  it("returns 0 for a user with no credits", async () => {
    const u = await makeUser();
    expect(await bal(u.id)).toBe(0);
  });
});

describe("redeemCredits", () => {
  it("writes a non-expiring negative row and reduces the balance", async () => {
    const u = await makeUser();
    await makeCredit(u.id, { amount: 40, source: "cashback_hotel" });
    const res = await redeemCredits(u.id, 15);
    expect(res.remainingBalance).toBe(25);
    expect(await bal(u.id)).toBe(25);
  });

  it("rejects redeeming more than the balance", async () => {
    const u = await makeUser();
    await makeCredit(u.id, { amount: 10 });
    await expect(redeemCredits(u.id, 50)).rejects.toThrow(/insufficient/i);
  });
});

describe("awardCashback", () => {
  const RATE = cashbackRateFor("hotel");

  it("awards the hotel rate on a cash hotel booking (first booking)", async () => {
    const u = await makeUser();
    const b = await makeBooking(u.id, { leg: "hotel" });
    const credit = await awardCashback({ userId: u.id, bookingId: b.id, cashValueGbp: 300, leg: "hotel" });
    expect(credit.amount).toBe(Math.round(300 * RATE * 100) / 100);
  });

  it("earns nothing on a flight leg (flights don't earn Credits)", async () => {
    const u = await makeUser();
    const b = await makeBooking(u.id, { leg: "flight" });
    expect(await awardCashback({ userId: u.id, bookingId: b.id, cashValueGbp: 300, leg: "flight" })).toBeNull();
  });

  it("awards on a first booking regardless of Pro status", async () => {
    const u = await makeUser();
    const b = await makeBooking(u.id, { leg: "hotel" });
    expect(await awardCashback({ userId: u.id, bookingId: b.id, cashValueGbp: 200, leg: "hotel" })).not.toBeNull();
  });

  it("does not award to a free user's second booking", async () => {
    const u = await makeUser();
    await makeBooking(u.id, { leg: "hotel" }); // first
    const b2 = await makeBooking(u.id, { leg: "hotel" }); // second
    expect(await awardCashback({ userId: u.id, bookingId: b2.id, cashValueGbp: 200, leg: "hotel" })).toBeNull();
  });

  it("awards to a Pro user on every (hotel) booking", async () => {
    const u = await makeProUser();
    await makeBooking(u.id, { leg: "hotel" });
    const b2 = await makeBooking(u.id, { leg: "hotel" });
    expect(await awardCashback({ userId: u.id, bookingId: b2.id, cashValueGbp: 200, leg: "hotel" })).not.toBeNull();
  });

  it("flags a second first-booking claim from the same device", async () => {
    const device = "device-xyz";
    const a = await makeUser({ deviceFingerprint: device });
    const b = await makeUser({ deviceFingerprint: device });
    const bkA = await makeBooking(a.id, { leg: "hotel" });
    await awardCashback({ userId: a.id, bookingId: bkA.id, cashValueGbp: 200, leg: "hotel" }); // first claim ok
    const bkB = await makeBooking(b.id, { leg: "hotel" });
    const result = await awardCashback({ userId: b.id, bookingId: bkB.id, cashValueGbp: 200, leg: "hotel" });
    expect(result).toBeNull(); // held for review
    const flagged = await prisma.userEvent.findFirst({ where: { userId: b.id, type: "credit_flagged_for_review" } });
    expect(flagged).not.toBeNull();
  });

  it("sets an expiry in the future on earned rows", async () => {
    const u = await makeUser();
    const b = await makeBooking(u.id, { leg: "hotel" });
    const credit = await awardCashback({ userId: u.id, bookingId: b.id, cashValueGbp: 200, leg: "hotel" });
    expect(new Date(credit.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});
