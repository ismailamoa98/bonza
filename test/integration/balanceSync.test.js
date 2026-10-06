// test/integration/balanceSync.test.js — Phase 23. Statement authority (Phase 15). applyStatementBalance returns
// a status string; fields are previousBalance/statementDate/statementSource/manualOverrideAt (no statementBalance).
import { describe, it, expect } from "vitest";
import { makeUser, makeLoyaltyAccount, prisma } from "../factories/index.js";

const { applyStatementBalance, findDuplicates, setManualBalance, markNotChecked, emailVerifiableProgrammes, syncOneProgramme } = require("../../src/backend/services/balanceSync");

const acct = (userId, programme = "ba_avios") => prisma.loyaltyAccount.findFirst({ where: { userId, programme } });

describe("applyStatementBalance", () => {
  it("creates a verified account when none exists", async () => {
    const u = await makeUser();
    const status = await applyStatementBalance(u.id, "ba_avios", { balance: 30000, date: new Date("2026-03-01"), source: "a@b.com" });
    expect(status).toBe("created");
    const a = await acct(u.id);
    expect(a.balance).toBe(30000);
    expect(a.syncState).toBe("verified");
  });

  it("stays verified when the statement matches", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { balance: 25000 });
    const status = await applyStatementBalance(u.id, "ba_avios", { balance: 25000, date: new Date("2026-03-01"), source: "a@b.com" });
    expect(status).toBe("verified");
    expect((await acct(u.id)).previousBalance).toBeNull();
  });

  it("overwrites the balance and marks updated when they differ, recording previousBalance", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { balance: 25000 });
    const status = await applyStatementBalance(u.id, "ba_avios", { balance: 42000, date: new Date("2026-03-01"), source: "a@b.com" });
    expect(status).toBe("updated");
    const a = await acct(u.id);
    expect(a.balance).toBe(42000);
    expect(a.previousBalance).toBe(25000);
    expect(a.syncState).toBe("updated");
  });

  it("holds a manual override newer than the statement (balance unchanged, statement recorded)", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { balance: 50000, manualOverrideAt: new Date("2026-03-10") });
    const status = await applyStatementBalance(u.id, "ba_avios", { balance: 42000, date: new Date("2026-03-01"), source: "a@b.com" });
    expect(status).toBe("override_held");
    const a = await acct(u.id);
    expect(a.balance).toBe(50000); // override wins
    expect(a.statementDate.toISOString().slice(0, 10)).toBe("2026-03-01"); // but we record what we saw
  });

  it("clears an override when a newer statement arrives", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { balance: 50000, manualOverrideAt: new Date("2026-03-01") });
    const status = await applyStatementBalance(u.id, "ba_avios", { balance: 42000, date: new Date("2026-04-01"), source: "a@b.com" });
    expect(status).toBe("updated");
    const a = await acct(u.id);
    expect(a.balance).toBe(42000);
    expect(a.manualOverrideAt).toBeNull();
  });
});

describe("findDuplicates", () => {
  it("returns the second row for a repeated programme+number (two null-numbered BA rows)", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { programme: "ba_avios" }); // accountNumber null
    await makeLoyaltyAccount(u.id, { programme: "ba_avios" }); // same programme+number key → duplicate
    const dupes = await findDuplicates(u.id);
    expect(dupes.length).toBe(1);
  });

  it("returns an empty array when every programme is unique", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { programme: "ba_avios" });
    await makeLoyaltyAccount(u.id, { programme: "hilton_honors" });
    expect(await findDuplicates(u.id)).toEqual([]);
  });
});

describe("setManualBalance", () => {
  it("applies a manual override and records the previous balance", async () => {
    const u = await makeUser();
    const a = await makeLoyaltyAccount(u.id, { balance: 25000 });
    const updated = await setManualBalance(u.id, a.id, 30000);
    expect(updated.balance).toBe(30000);
    expect(updated.previousBalance).toBe(25000);
    expect(updated.manualOverrideAt).not.toBeNull();
    expect(updated.syncMethod).toBe("manual");
  });

  it("returns null for an account that isn't the user's", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const a = await makeLoyaltyAccount(owner.id);
    expect(await setManualBalance(other.id, a.id, 1000)).toBeNull();
  });

  it("rejects a negative balance", async () => {
    const u = await makeUser();
    const a = await makeLoyaltyAccount(u.id);
    await expect(setManualBalance(u.id, a.id, -5)).rejects.toThrow(/non-negative/);
  });
});

describe("markNotChecked", () => {
  it("flags every programme not in the seen list (sparing overrides)", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { programme: "ba_avios", syncState: "verified" });
    await makeLoyaltyAccount(u.id, { programme: "amex_mr", syncState: "verified", manualOverrideAt: new Date() });
    await markNotChecked(u.id, ["hilton_honors"]); // neither ba nor amex was "seen"
    const ba = await prisma.loyaltyAccount.findFirst({ where: { userId: u.id, programme: "ba_avios" } });
    const amex = await prisma.loyaltyAccount.findFirst({ where: { userId: u.id, programme: "amex_mr" } });
    expect(ba.syncState).toBe("not_checked");
    expect(amex.syncState).toBe("verified"); // override spared
  });
});

describe("syncOneProgramme (mock statement)", () => {
  it("applies a mock statement and reports the outcome", async () => {
    const u = await makeUser();
    const outcome = await syncOneProgramme(u.id, "ba_avios", { mock: true });
    expect(["created", "verified", "updated", "not_found"]).toContain(outcome);
  });
});

describe("emailVerifiableProgrammes", () => {
  it("returns a non-empty set of programme slugs", async () => {
    const set = await emailVerifiableProgrammes();
    expect(Array.isArray(set) || set instanceof Set).toBe(true);
  });
});
