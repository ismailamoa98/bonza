// test/integration/redemptionEngine.test.js — Phase 23. Ranks points / transfer / hybrid / cash redemption
// scenarios from the user's real loyalty balances (DB-backed). Called directly with a userId (reliable —
// this harness doesn't steer HTTP auth to an arbitrary user). Deterministic offline compute, no network.
import { describe, it, expect } from "vitest";
import { makeUser, makeLoyaltyAccount } from "../factories/index.js";

const { generateRedemptionOptions } = require("../../src/backend/services/redemptionEngine");

const trip = { estimatedCashPrice: 300, estimatedFlightPrice: 140, estimatedHotelPrice: 160 };

describe("generateRedemptionOptions", () => {
  it("returns cash_only when the user holds no loyalty accounts", async () => {
    const u = await makeUser();
    const out = await generateRedemptionOptions(u.id, trip);
    expect(out.mode).toBe("cash_only");
  });

  it("always includes a cash scenario", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { programme: "ba_avios", balance: 500000, valueGbp: 5500 });
    const out = await generateRedemptionOptions(u.id, trip);
    expect(out.all.some((s) => s.type === "cash")).toBe(true);
  });

  it("surfaces a direct points scenario when a programme can afford the redemption", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { programme: "world_of_hyatt", balance: 500000, valueGbp: 9000 });
    const out = await generateRedemptionOptions(u.id, trip);
    const points = out.all.find((s) => s.type === "points");
    expect(points).toBeTruthy();
    expect(points.pointsUsed).toBeGreaterThan(0);
    expect(points.pointsRemaining).toBe(500000 - points.pointsUsed);
  });

  it("includes a transfer scenario when a transferable currency can reach a partner", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { programme: "amex_mr", balance: 500000, valueGbp: 9000 });
    const out = await generateRedemptionOptions(u.id, trip);
    const transfer = out.all.find((s) => s.type === "transfer");
    expect(transfer).toBeTruthy();
    expect(transfer.fromProgramme).toBe("amex_mr");
    expect(transfer.transferRatio).toBe(1);
  });

  it("does not offer a transfer when the only programme has no partner path", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { programme: "ihg_one", balance: 500000, valueGbp: 3000 });
    const out = await generateRedemptionOptions(u.id, trip);
    expect(out.all.some((s) => s.type === "transfer")).toBe(false);
  });

  it("ranks the best scenario first by value score", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { programme: "world_of_hyatt", balance: 500000, valueGbp: 9000 });
    await makeLoyaltyAccount(u.id, { programme: "ihg_one", balance: 500000, valueGbp: 3000 });
    const out = await generateRedemptionOptions(u.id, trip);
    expect(out.best).toBe(out.all[0]);
    const scores = out.all.map((s) => s.valueScore || 0);
    expect(scores[0]).toBe(Math.max(...scores));
  });
});
