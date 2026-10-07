// test/unit/awardLinks.test.js — Phase 23. The real deep links to hotel-programme award searches and
// card-issuer transfer portals. Pure functions, no DB/keys. (The spec's "deepLinkService" is these +
// affiliateService in this codebase.)
import { describe, it, expect } from "vitest";

const { hotelAwardLink, buyPointsLink, issuerTransferLink } = require("../../src/backend/services/awardLinks");

describe("hotelAwardLink", () => {
  it("builds a Marriott award search with the points toggle on and the city encoded", () => {
    const url = hotelAwardLink("marriott_bonvoy", { city: "New York", checkIn: "2026-05-01", checkOut: "2026-05-05", adults: 2 });
    expect(url).toContain("marriott.com");
    expect(url).toContain("useRewardsPoints=true");
    expect(url).toContain("New%20York"); // URL-encoded
    expect(url).toContain("numberOfAdults=2");
  });

  it("builds Hilton / Hyatt / IHG award links with their redemption flags", () => {
    expect(hotelAwardLink("hilton_honors", { city: "Rome" })).toContain("redeemPts=true");
    expect(hotelAwardLink("world_of_hyatt", { city: "Rome" })).toContain("rate=Points");
    expect(hotelAwardLink("ihg_one", { city: "Rome" })).toContain("qRewardsType=Points");
  });

  it("falls back to at least one adult", () => {
    expect(hotelAwardLink("hilton_honors", { city: "Rome", adults: 0 })).toContain("room1NumAdults=1");
  });

  it("returns null for an unknown programme (caller falls back to a plain handoff)", () => {
    expect(hotelAwardLink("ba_avios", { city: "Rome" })).toBeNull();
  });
});

describe("buyPointsLink", () => {
  it("returns the buy-points page for a supported programme", () => {
    expect(buyPointsLink("hilton_honors")).toContain("buy-points");
  });
  it("returns null for an unsupported programme", () => {
    expect(buyPointsLink("ba_avios")).toBeNull();
  });
});

describe("issuerTransferLink", () => {
  it("returns the Amex / Chase transfer portals", () => {
    expect(issuerTransferLink("amex_mr")).toContain("americanexpress.com");
    expect(issuerTransferLink("chase_ur")).toContain("chase.com");
  });
  it("returns null for a non-issuer programme", () => {
    expect(issuerTransferLink("marriott_bonvoy")).toBeNull();
  });
});
