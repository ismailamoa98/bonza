// test/integration/services.test.js — Phase 23. Small DB-backed service helpers called directly: the
// affiliate click ledger, the append-only event log, and the nightly valuation repricing.
import { describe, it, expect } from "vitest";
import { makeUser, makeLoyaltyAccount, prisma } from "../factories/index.js";

const { recordClick } = require("../../src/backend/services/affiliateService");
const { recordEvent, EVENT_TYPES } = require("../../src/backend/utils/eventTracker");
const { refreshValuations } = require("../../src/backend/jobs/valuationRefreshJob");

describe("affiliateService.recordClick", () => {
  it("writes an AffiliateClick row before the user is handed off", async () => {
    const u = await makeUser();
    await recordClick({ userId: u.id, programme: "awin_marriott", destinationUrl: "https://marriott.com/x", bookingType: "cash", leg: "hotel" });
    const clicks = await prisma.affiliateClick.findMany({ where: { userId: u.id } });
    expect(clicks).toHaveLength(1);
    expect(clicks[0].destination).toBe("https://marriott.com/x");
    expect(clicks[0].leg).toBe("hotel");
  });

  it("records an anonymous click with a null userId", async () => {
    await recordClick({ userId: null, programme: "travelpayouts", destinationUrl: "https://booking.com/y", bookingType: "cash", leg: "hotel" });
    const click = await prisma.affiliateClick.findFirst({ where: { programme: "travelpayouts" } });
    expect(click.userId).toBeNull();
  });
});

describe("eventTracker.recordEvent", () => {
  it("appends a typed UserEvent with metadata", async () => {
    const u = await makeUser();
    await recordEvent(u.id, EVENT_TYPES.DEEP_LINK_CLICKED, { leg: "hotel", programme: "world_of_hyatt" });
    const ev = await prisma.userEvent.findFirst({ where: { userId: u.id, type: "deep_link_clicked" } });
    expect(ev).toBeTruthy();
    expect(ev.metadata.programme).toBe("world_of_hyatt");
  });

  it("never throws on a bad write — returns null instead of breaking the caller", async () => {
    const ev = await recordEvent("user_does_not_exist", EVENT_TYPES.BOOKING_CONFIRMED, {});
    expect(ev).toBeNull(); // FK violation is swallowed (append-only log is best-effort)
  });
});

describe("valuationRefreshJob.refreshValuations", () => {
  it("reprices every LoyaltyAccount.valueGbp from the current cents-per-point", async () => {
    const u = await makeUser();
    const acct = await makeLoyaltyAccount(u.id, { programme: "world_of_hyatt", balance: 100000, valueGbp: 1 });
    const result = await refreshValuations();
    expect(result.repriced).toBeGreaterThanOrEqual(1);
    const after = await prisma.loyaltyAccount.findUnique({ where: { id: acct.id } });
    // world_of_hyatt = 1.8¢/pt → £1.80/1000pt → 100,000 pts = £1,800
    expect(after.valueGbp).toBeCloseTo(1800, 2);
  });
});
