// test/integration/auditLog.test.js — Phase 27 §27k. The append-only AuditEvent trail: provenance resolves
// from the §27i request context, every trust-sensitive mutation records a row, and the migration enforces
// append-only at the DB. Covers money/balance/booking/plan/account/consent + a quarantine resolution.
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { asUser } from "../helpers/auth.js";
import { makeUser, makeLoyaltyAccount, prisma } from "../factories/index.js";

const app = require("../../src/backend/server");
const requestContext = require("../../src/backend/utils/requestContext");
const { recordAudit, ACTIONS } = require("../../src/backend/services/auditService");
const { setManualBalance } = require("../../src/backend/services/balanceSync");
const { awardCashback, reverseCredits } = require("../../src/backend/services/creditsService");
const { writeBooking } = require("../../src/backend/utils/bookingWriter");
const { startDeletion } = require("../../src/backend/services/accountDeletion");
const { runRetention } = require("../../src/backend/jobs/retentionJob");

const DEV_ID = "user_dev_demo"; // authed HTTP acts as the seeded dev user
const auditFor = (subjectUserId, action) =>
  prisma.auditEvent.findMany({ where: { subjectUserId, ...(action ? { action } : {}) }, orderBy: { at: "desc" } });

describe("auditService — provenance resolution (§27k)", () => {
  it("records a system actor with null ids outside any request context", async () => {
    const u = await makeUser();
    const row = await recordAudit({ action: "test.outside", subjectUserId: u.id });
    expect(row.actorType).toBe("system");
    expect(row.actorId).toBeNull();
    expect(row.requestId).toBeNull();
    expect(row.ipHash).toBeNull();
  });

  it("resolves actor/request/ip from the §27i context", async () => {
    const u = await makeUser();
    await requestContext.run({ requestId: "req-audit-1", ipHash: "hash-xyz", userId: u.id }, async () => {
      await recordAudit({ action: "test.inside", subjectUserId: u.id });
    });
    const [row] = await auditFor(u.id, "test.inside");
    expect(row.actorType).toBe("user");
    expect(row.actorId).toBe(u.id);
    expect(row.requestId).toBe("req-audit-1");
    expect(row.ipHash).toBe("hash-xyz");
  });

  it("is best-effort — a bad write returns null instead of throwing", async () => {
    const row = await recordAudit({ action: null, subjectUserId: "nobody" }); // action is NOT NULL → DB error
    expect(row).toBeNull();
  });
});

describe("audit write points (§27k)", () => {
  it("manual balance override → balance.manual_override (before/after)", async () => {
    const u = await makeUser();
    const acct = await makeLoyaltyAccount(u.id, { balance: 10000, syncMethod: "manual" });
    await requestContext.run({ requestId: "req-bal", ipHash: "h", userId: u.id }, async () => {
      await setManualBalance(u.id, acct.id, 12345);
    });
    const [row] = await auditFor(u.id, ACTIONS.BALANCE_MANUAL_OVERRIDE);
    expect(row.entityId).toBe(acct.id);
    expect(row.before).toEqual({ balance: 10000 });
    expect(row.after).toEqual({ balance: 12345 });
    expect(row.requestId).toBe("req-bal");
  });

  it("cashback award → credit.awarded, and a reversal → credit.reversed (both system actors)", async () => {
    const u = await makeUser();
    const booking = await prisma.booking.create({
      data: { userId: u.id, leg: "hotel", bookingType: "cash", supplier: "booking", cashAmount: 20000, cashCurrency: "GBP", confirmedAt: new Date(), confirmationMethod: "affiliate_handoff", status: "confirmed" },
    });
    const credit = await awardCashback({ userId: u.id, bookingId: booking.id, cashAmountPence: 20000, leg: "hotel" });
    expect(credit).toBeTruthy();
    const [awarded] = await auditFor(u.id, ACTIONS.CREDIT_AWARDED);
    expect(awarded.actorType).toBe("system");
    expect(awarded.entity).toBe("BonzaCredit");

    await reverseCredits({ userId: u.id, bookingId: booking.id, proportion: 1 });
    const [reversed] = await auditFor(u.id, ACTIONS.CREDIT_REVERSED);
    expect(reversed.after.amountPence).toBeLessThan(0);
  });

  it("writeBooking → booking.created", async () => {
    const u = await makeUser();
    const booking = await writeBooking(u.id, { leg: "flight", bookingType: "cash", supplier: "duffel", cashValueGbp: 180, confirmationMethod: "duffel" });
    const [row] = await auditFor(u.id, ACTIONS.BOOKING_CREATED);
    expect(row.entityId).toBe(booking.id);
    expect(row.after.confirmationMethod).toBe("duffel");
  });

  it("account deletion request → account.delete_requested", async () => {
    const u = await makeUser();
    await startDeletion(u.id);
    const [row] = await auditFor(u.id, ACTIONS.ACCOUNT_DELETE_REQUESTED);
    expect(row.entity).toBe("User");
  });
});

describe("audit via HTTP — context propagation (§27k)", () => {
  beforeEach(async () => {
    await makeUser({ id: DEV_ID });
    asUser(DEV_ID);
  });

  it("acknowledging a quarantine → balance.quarantine_resolved, carrying the request's x-request-id", async () => {
    await prisma.statementQuarantine.create({
      data: { userId: DEV_ID, programme: "ba_avios", parsedBalance: 999999, confidence: 0.4, matchedPattern: "loose", verdict: "quarantine", reason: "implausible", resolved: false },
    });
    const res = await request(app).post("/api/v1/points/review/acknowledge").set("x-request-id", "trace-ack-1").send({});
    expect(res.status).toBe(200);
    const [row] = await auditFor(DEV_ID, ACTIONS.BALANCE_QUARANTINE_RESOLVED);
    expect(row).toBeTruthy();
    expect(row.after.resolution).toBe("keep_mine");
    expect(row.requestId).toBe("trace-ack-1"); // §27i context → §27k audit row, end-to-end over HTTP
    expect(row.actorType).toBe("user");
    expect(row.actorId).toBe(DEV_ID);
  });
});

describe("append-only enforcement (§27k)", () => {
  it("the migration REVOKEs UPDATE/DELETE on AuditEvent from bonza_app", () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, "../../src/backend/db/migrations/20261118000000_phase27k_audit_log/migration.sql"),
      "utf8",
    );
    expect(sql).toMatch(/REVOKE UPDATE, DELETE ON "AuditEvent" FROM bonza_app/);
    expect(sql).toMatch(/GRANT SELECT, INSERT ON "AuditEvent" TO bonza_app/);
  });

  it("retention prunes audit rows older than 7 years and keeps recent ones", async () => {
    const u = await makeUser();
    const old = await prisma.auditEvent.create({ data: { actorType: "system", subjectUserId: u.id, action: "test.old", at: new Date("2015-01-01T00:00:00Z") } });
    const recent = await recordAudit({ action: "test.recent", subjectUserId: u.id });
    const counts = await runRetention();
    expect(counts.auditEvent).toBeGreaterThanOrEqual(1);
    expect(await prisma.auditEvent.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await prisma.auditEvent.findUnique({ where: { id: recent.id } })).not.toBeNull();
  });
});
