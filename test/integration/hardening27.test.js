// test/integration/hardening27.test.js — Phase 27 §27a + §27e. Concurrency (row-locked balance writes),
// inbound-webhook idempotency, refund credit-reversal, and the partial unique indexes.
import { describe, it, expect, beforeEach } from "vitest";
import { makeUser, makeLoyaltyAccount, makeBooking, prisma } from "../factories/index.js";

const { applyStatementBalance } = require("../../src/backend/services/balanceSync");
const { oncePerEvent } = require("../../src/backend/utils/webhookIdempotency");
const { awardCashback, reverseCredits, redeemCredits, getCreditBalance } = require("../../src/backend/services/creditsService");

beforeEach(async () => {
  // factories + global reset handle isolation
});

describe("§27a — row-locked balance writes", () => {
  it("two simultaneous statements on one account → one consistent balance, no lost update", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { balance: 10000 });
    await Promise.all([
      applyStatementBalance(u.id, "ba_avios", { balance: 20000, date: new Date("2026-03-01"), receivedAt: new Date("2026-03-01") }),
      applyStatementBalance(u.id, "ba_avios", { balance: 30000, date: new Date("2026-03-02"), receivedAt: new Date("2026-03-02") }),
    ]);
    const rows = await prisma.loyaltyAccount.findMany({ where: { userId: u.id, programme: "ba_avios" } });
    expect(rows).toHaveLength(1); // no duplicate row created under the race
    expect([20000, 30000]).toContain(rows[0].balance); // a clean last-writer value, not a torn write
  });
});

describe("§27a — inbound webhook idempotency", () => {
  it("replaying the same event id runs the effect exactly once and reports duplicates", async () => {
    let runs = 0;
    const effect = async () => { runs += 1; return "ok"; };
    const r1 = await oncePerEvent({ provider: "stripe", eventId: "evt_dupe_1" }, effect);
    const r2 = await oncePerEvent({ provider: "stripe", eventId: "evt_dupe_1" }, effect);
    const r3 = await oncePerEvent({ provider: "stripe", eventId: "evt_dupe_1" }, effect);
    expect(runs).toBe(1);
    expect(r1.duplicate).toBe(false);
    expect(r2.duplicate).toBe(true);
    expect(r3.duplicate).toBe(true);
  });

  it("a failed effect drops the marker so a genuine redelivery retries", async () => {
    let calls = 0;
    const flaky = async () => { calls += 1; if (calls === 1) throw new Error("boom"); return "ok"; };
    await expect(oncePerEvent({ provider: "duffel", eventId: "evt_retry_1" }, flaky)).rejects.toThrow("boom");
    const r = await oncePerEvent({ provider: "duffel", eventId: "evt_retry_1" }, flaky);
    expect(r.duplicate).toBe(false);
    expect(calls).toBe(2);
  });
});

describe("§27e-3 — refund reverses credits", () => {
  async function awardOnBooking() {
    const u = await makeUser();
    const booking = await makeBooking(u.id, { leg: "hotel", cashAmount: 40000 });
    const credit = await awardCashback({ userId: u.id, bookingId: booking.id, cashAmountPence: 40000, leg: "hotel" });
    return { u, booking, credit };
  }

  it("a partial refund posts a proportional compensating entry", async () => {
    const { u, booking, credit } = await awardOnBooking();
    expect(credit.amountPence).toBeGreaterThan(0);
    await reverseCredits({ userId: u.id, bookingId: booking.id, proportion: 0.5 });
    const { rawBalancePence } = await getCreditBalance(u.id);
    expect(rawBalancePence).toBeCloseTo(credit.amountPence * 0.5, 0);
  });

  it("a full refund zeroes the balance", async () => {
    const { u, booking } = await awardOnBooking();
    await reverseCredits({ userId: u.id, bookingId: booking.id, proportion: 1 });
    const { rawBalancePence } = await getCreditBalance(u.id);
    expect(rawBalancePence).toBe(0);
  });

  it("a refund after the credits are spent leaves a negative balance and blocks redemption", async () => {
    const { u, booking, credit } = await awardOnBooking();
    await redeemCredits(u.id, credit.amountPence); // spend it all
    await reverseCredits({ userId: u.id, bookingId: booking.id, proportion: 1 });
    const { rawBalancePence } = await getCreditBalance(u.id);
    expect(rawBalancePence).toBeLessThan(0);
    await expect(redeemCredits(u.id, 1)).rejects.toMatchObject({ status: 409 });
  });
});

describe("§27e-1 — partial unique indexes", () => {
  it("rejects a second no-number membership for the same programme", async () => {
    const u = await makeUser();
    const base = { userId: u.id, programme: "amex_mr", accountNumber: null, balance: 1, valuePence: 0, syncState: "verified", lastSynced: new Date(), syncMethod: "manual" };
    await prisma.loyaltyAccount.create({ data: base });
    await expect(prisma.loyaltyAccount.create({ data: base })).rejects.toMatchObject({ code: "P2002" });
  });

  it("rejects a duplicate country-level ExploreRoute (cityId IS NULL)", async () => {
    await prisma.exploreCountry.create({ data: { code: "zz", name: "Testland", gradient: "x" } });
    const route = { originCode: "LON", countryCode: "zz", cityId: null, cashFrom: 100, pointsFrom: 1000, pointsProgramme: "ba_avios" };
    await prisma.exploreRoute.create({ data: route });
    await expect(prisma.exploreRoute.create({ data: route })).rejects.toMatchObject({ code: "P2002" });
  });
});
