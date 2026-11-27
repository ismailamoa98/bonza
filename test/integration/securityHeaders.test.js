// test/integration/securityHeaders.test.js — Phase 27 §27j. helmet security headers + the CSP (report-only by
// default) on the API tier, and the CSP violation-report sink.
import { describe, it, expect } from "vitest";
import request from "supertest";

const app = require("../../src/backend/server");

describe("security headers (§27j)", () => {
  it("sets an ENFORCING CSP with the third-party allowlist and no script unsafe-inline", async () => {
    const res = await request(app).get("/api/v1/status");
    // Enforced by default (go-live cutover); CSP_REPORT_ONLY=true would move it to the -report-only header.
    const csp = res.headers["content-security-policy"];
    expect(csp, "enforcing CSP header present").toBeTruthy();
    expect(res.headers["content-security-policy-report-only"]).toBeUndefined(); // enforcing, not report-only
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("js.stripe.com");
    expect(csp).toContain("eu.i.posthog.com");
    expect(csp).toContain("challenges.cloudflare.com");
    expect(csp).toMatch(/script-src [^;]*clerk/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/); // scripts never inline
    expect(csp).toContain("report-uri /api/v1/security/csp-report");
  });

  it("sets HSTS, nosniff, frame, referrer and permissions-policy headers", async () => {
    const res = await request(app).get("/api/v1/status");
    expect(res.headers["strict-transport-security"]).toMatch(/max-age=\d+/);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(res.headers["permissions-policy"]).toContain("camera=()");
    expect(res.headers["x-powered-by"]).toBeUndefined(); // helmet hides it
  });

  it("accepts a CSP violation report and returns 204", async () => {
    const res = await request(app)
      .post("/api/v1/security/csp-report")
      .set("content-type", "application/csp-report")
      .send(JSON.stringify({ "csp-report": { "violated-directive": "script-src", "blocked-uri": "https://evil.example" } }));
    expect(res.status).toBe(204);
  });
});
