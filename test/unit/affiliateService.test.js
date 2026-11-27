// test/unit/affiliateService.test.js — Phase 23. buildAffiliateUrl wraps an outbound URL with per-network
// affiliate tracking (the deep-link side of what the spec called "deepLinkService"). env reads process.env
// eagerly at require time, so we set the markers BEFORE requiring the module.
import { describe, it, expect } from "vitest";

process.env.AWIN_AFFILIATE_ID = "99999";
process.env.TRAVELPAYOUTS_TOKEN = "tp_marker_1";
process.env.IMPACT_HYATT_CAMPAIGN_ID = "imp_123";

const { buildAffiliateUrl } = require("../../src/backend/services/affiliateService");

describe("buildAffiliateUrl", () => {
  it("wraps an Awin destination with the advertiser (awinmid) and publisher (awinaffid) ids", () => {
    const url = buildAffiliateUrl("awin_marriott", "https://marriott.com/x", "hotel");
    expect(url).toContain("awinmid=5678"); // Marriott advertiser id
    expect(url).toContain("awinaffid=99999"); // our publisher id
    expect(url).toContain("clickref=bonza_hotel");
  });

  it("URL-encodes the destination parameter", () => {
    const dest = "https://marriott.com/x?a=1&b=2";
    const url = buildAffiliateUrl("awin_marriott", dest, "hotel");
    expect(url).toContain(`p=${encodeURIComponent(dest)}`);
    expect(url).not.toContain("a=1&b=2"); // the raw query must not leak unencoded
  });

  it("wraps a Travelpayouts destination with the marker and encoded url", () => {
    const dest = "https://booking.com/hotel/x";
    const url = buildAffiliateUrl("travelpayouts", dest, "hotel");
    expect(url).toContain("marker=tp_marker_1");
    expect(url).toContain(`u=${encodeURIComponent(dest)}`);
  });

  it("returns the destination unchanged for an unknown programme", () => {
    expect(buildAffiliateUrl("nope", "https://x.com", "hotel")).toBe("https://x.com");
  });

  it("returns null for a null destination", () => {
    expect(buildAffiliateUrl("awin_marriott", null, "hotel")).toBeNull();
  });
});
