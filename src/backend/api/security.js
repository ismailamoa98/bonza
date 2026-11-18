// api/security.js — Phase 27 §27d. Public endpoint the signup pre-gate uses to verify a Cloudflare Turnstile
// token before revealing the Clerk sign-up form (Clerk owns the actual signup submit, so this is a soft bot
// gate in front of it). Offline it accepts (skipped). Mounted public, under the global per-IP limiter.
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../services/turnstile");
const { logger } = require("../utils/logger");

// POST /api/v1/security/turnstile/verify — { token } → { ok }.
router.post("/turnstile/verify", async (req, res, next) => {
  try {
    const token = req.body?.token || req.body?.turnstileToken || null;
    const result = await verifyToken(token, req.ip);
    res.status(result.ok ? 200 : 400).json({ ok: result.ok, skipped: !!result.skipped });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/security/csp-report — §27j local sink for CSP violation reports (the fallback when
// CSP_REPORT_URI doesn't point the browser straight at Sentry). Browsers send application/csp-report or the
// Reporting-API application/reports+json; parse both. Best-effort — always 204, never error.
const cspBodyParser = express.json({
  type: ["application/csp-report", "application/reports+json", "application/json"],
  limit: "20kb",
});
router.post("/csp-report", cspBodyParser, (req, res) => {
  try {
    const body = req.body || {};
    // Legacy report-uri shape: { "csp-report": {...} }; Reporting-API shape: [{ body: {...} }].
    const r = body["csp-report"] || (Array.isArray(body) ? body[0]?.body : null) || body;
    logger.warn("[csp] violation", {
      directive: r?.["violated-directive"] || r?.effectiveDirective,
      blocked: r?.["blocked-uri"] || r?.blockedURL,
      document: r?.["document-uri"] || r?.documentURL,
    });
  } catch {
    /* never fail a report */
  }
  res.status(204).end();
});

module.exports = router;
