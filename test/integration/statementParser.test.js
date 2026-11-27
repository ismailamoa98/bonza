// test/integration/statementParser.test.js — Phase 27 §27c. The statement-parser hardening funnel end to
// end: statementGuard decides apply / quarantine / reject in front of applyStatementBalance, every decision
// records a ParseAttempt, quarantined reads surface in GET /points/review (the §15 modal) and clear on
// acknowledge, and /admin/parsers reports per-programme success rate. The real (non-mock) readStatement path
// is driven by registering a throwaway email provider so a controlled body exercises the whole gate. We also
// assert the raw body is never persisted.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { asGuest } from "../helpers/auth.js";
import { makeUser, makeLoyaltyAccount, prisma } from "../factories/index.js";

const app = require("../../src/backend/server");
const balanceSync = require("../../src/backend/services/balanceSync");
const emailSync = require("../../src/backend/services/emailLoyaltySync");
const stats = require("../../src/backend/services/statementStats");
const { runParseStats } = require("../../src/backend/jobs/parseStatsJob");

// Register a fake provider so readStatement's real path parses a body we control (ba_avios has patterns).
function ctx(body) {
  emailSync.EMAIL_PROVIDERS.__test = { fetchLatestBody: async () => body };
  return { mock: false, provider: "__test", accessToken: "x" };
}
afterEach(() => {
  delete emailSync.EMAIL_PROVIDERS.__test;
});

const acct = (userId) => prisma.loyaltyAccount.findFirst({ where: { userId, programme: "ba_avios" } });

describe("syncOneProgramme — statementGuard funnel", () => {
  it("applies a confident, plausible statement and records an 'applied' attempt", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { balance: 35000 });

    const outcome = await balanceSync.syncOneProgramme(u.id, "ba_avios", ctx("Your Avios balance is 38,000 Avios."));
    expect(outcome).toBe("updated");
    expect((await acct(u.id)).balance).toBe(38000);

    const attempts = await prisma.parseAttempt.findMany({ where: { programme: "ba_avios" } });
    expect(attempts.map((a) => a.outcome)).toContain("applied");
    expect(await stats.openQuarantines(u.id)).toHaveLength(0);
  });

  it("quarantines an implausible jump, keeps the current balance, and records a quarantine", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { balance: 10000 });

    const outcome = await balanceSync.syncOneProgramme(u.id, "ba_avios", ctx("Your Avios balance is 90,000 Avios."));
    expect(outcome).toBe("quarantined");
    expect((await acct(u.id)).balance).toBe(10000); // unchanged — the user's value is kept

    const open = await stats.openQuarantines(u.id);
    expect(open).toHaveLength(1);
    expect(open[0].reason).toBe("implausible_increase");
    expect(open[0].parsedBalance).toBe(90000);

    const attempts = await prisma.parseAttempt.findMany({ where: { userId: u.id } });
    expect(attempts.map((a) => a.outcome)).toContain("quarantined");
  });

  it("quarantines a low-confidence read (legacy pattern only)", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { balance: 35000 });
    // "500 Avios" — only the legacy regex matches an un-grouped sub-1000 number → confidence 0.35 < 0.5.
    const outcome = await balanceSync.syncOneProgramme(u.id, "ba_avios", ctx("You collected 500 Avios recently."));
    expect(outcome).toBe("quarantined");
    expect((await stats.openQuarantines(u.id))[0].reason).toBe("low_confidence");
  });

  it("rejects an absurdly large balance — not stored, not quarantined", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { balance: 35000 });

    const outcome = await balanceSync.syncOneProgramme(u.id, "ba_avios", ctx("Your Avios balance is 60,000,000 Avios."));
    expect(outcome).toBe("rejected");
    expect((await acct(u.id)).balance).toBe(35000);
    expect(await stats.openQuarantines(u.id)).toHaveLength(0);
    const attempts = await prisma.parseAttempt.findMany({ where: { userId: u.id } });
    expect(attempts.map((a) => a.outcome)).toContain("rejected");
  });

  it("a later confident statement supersedes an earlier quarantine", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { balance: 10000 });
    await balanceSync.syncOneProgramme(u.id, "ba_avios", ctx("Your Avios balance is 90,000 Avios.")); // quarantined
    expect(await stats.openQuarantines(u.id)).toHaveLength(1);

    await balanceSync.syncOneProgramme(u.id, "ba_avios", ctx("Your Avios balance is 12,000 Avios.")); // plausible
    expect((await acct(u.id)).balance).toBe(12000);
    expect(await stats.openQuarantines(u.id)).toHaveLength(0); // the quarantine was resolved
  });

  it("never persists the raw email body", async () => {
    const u = await makeUser();
    await makeLoyaltyAccount(u.id, { balance: 10000 });
    const body = "Your Avios balance is 90,000 Avios. Membership XJ-SECRET-7788.";
    await balanceSync.syncOneProgramme(u.id, "ba_avios", ctx(body));

    const quarantines = await prisma.statementQuarantine.findMany({ where: { userId: u.id } });
    const attempts = await prisma.parseAttempt.findMany({ where: { userId: u.id } });
    const dump = JSON.stringify([...quarantines, ...attempts]);
    expect(dump).not.toContain("SECRET");
    expect(dump).not.toContain("Membership");
    expect(quarantines[0].bodyFingerprint).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("GET /points/review — quarantine surfacing", () => {
  // Authed HTTP acts as the seeded dev user (asGuest → dev fallback), so the data lives under DEV_USER.id.
  const DEV_ID = "user_dev_demo";
  beforeEach(async () => {
    asGuest();
    await makeUser({ id: DEV_ID, email: "demo@bonza.app" });
  });

  it("surfaces an open quarantine with a confirm message, then clears it on acknowledge", async () => {
    await makeLoyaltyAccount(DEV_ID, { balance: 10000 });
    await balanceSync.syncOneProgramme(DEV_ID, "ba_avios", ctx("Your Avios balance is 90,000 Avios."));

    const review = await request(app).get("/api/v1/points/review");
    expect(review.status).toBe(200);
    expect(review.body.quarantined).toHaveLength(1);
    expect(review.body.quarantined[0]).toMatchObject({ programme: "ba_avios", parsedBalance: 90000, currentBalance: 10000 });
    expect(review.body.quarantined[0].message).toMatch(/far higher/i);

    const ack = await request(app).post("/api/v1/points/review/acknowledge");
    expect(ack.status).toBe(200);

    const after = await request(app).get("/api/v1/points/review");
    expect(after.body.quarantined).toHaveLength(0);
  });

  it("a manual override on the programme resolves its quarantine", async () => {
    const a = await makeLoyaltyAccount(DEV_ID, { balance: 10000 });
    await balanceSync.syncOneProgramme(DEV_ID, "ba_avios", ctx("Your Avios balance is 90,000 Avios."));

    const res = await request(app).patch(`/api/v1/points/balance/${a.id}`).send({ balance: 91000 });
    expect(res.status).toBe(200);
    expect(await stats.openQuarantines(DEV_ID)).toHaveLength(0);
  });
});

describe("GET /admin/parsers — per-programme success rate", () => {
  beforeEach(() => asGuest()); // dev-admin fallback in test

  it("reports success rate and flags a programme below the alarm threshold", async () => {
    // ba_avios: 5 good (applied), 5 bad (quarantined) → 50% over ≥5 attempts → alarming.
    for (let i = 0; i < 5; i++) await stats.recordAttempt({ programme: "ba_avios", outcome: "applied" });
    for (let i = 0; i < 5; i++) await stats.recordAttempt({ programme: "ba_avios", outcome: "quarantined" });
    // hilton_honors: all applied → healthy.
    for (let i = 0; i < 6; i++) await stats.recordAttempt({ programme: "hilton_honors", outcome: "applied" });

    const res = await request(app).get("/api/v1/admin/parsers");
    expect(res.status).toBe(200);
    const byProg = Object.fromEntries(res.body.programmes.map((p) => [p.programme, p]));
    expect(byProg.ba_avios.successRate).toBeCloseTo(0.5, 5);
    expect(byProg.ba_avios.alarming).toBe(true);
    expect(byProg.hilton_honors.successRate).toBe(1);
    expect(byProg.hilton_honors.alarming).toBe(false);
  });

  it("the nightly job computes rates and flags the alarming programme", async () => {
    for (let i = 0; i < 5; i++) await stats.recordAttempt({ programme: "ihg_one", outcome: "quarantined" });
    const result = await runParseStats();
    expect(result.programmes).toBeGreaterThanOrEqual(1);
    expect(result.alarming).toContain("ihg_one");
  });
});
