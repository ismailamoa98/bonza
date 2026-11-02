// api/security.js — Phase 27 §27d. Public endpoint the signup pre-gate uses to verify a Cloudflare Turnstile
// token before revealing the Clerk sign-up form (Clerk owns the actual signup submit, so this is a soft bot
// gate in front of it). Offline it accepts (skipped). Mounted public, under the global per-IP limiter.
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../services/turnstile");

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

module.exports = router;
