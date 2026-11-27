// services/turnstile.js — Phase 27 §27d. Server-side verification of a Cloudflare Turnstile token. Offline
// (no TURNSTILE_SECRET_KEY) it's a no-op accept so dev/tests stay frictionless; the frontend widget likewise
// renders nothing without a site key. When configured it POSTs the token to Cloudflare's siteverify endpoint.
const axios = require("axios");
const env = require("../config/env");
const { logger } = require("../utils/logger");

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Returns { ok, skipped?, codes? }. `ok:true, skipped:true` offline. Never throws — a verify outage shouldn't
// hard-fail a legitimate user; the caller decides how strict to be (support-contact rejects on !ok).
async function verifyToken(token, remoteIp) {
  if (!env.hasTurnstile) return { ok: true, skipped: true };
  if (!token) return { ok: false, codes: ["missing-input-response"] };

  try {
    const params = new URLSearchParams();
    params.append("secret", env.TURNSTILE_SECRET_KEY);
    params.append("response", token);
    if (remoteIp) params.append("remoteip", remoteIp);

    const res = await axios.post(SITEVERIFY_URL, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 5000,
    });
    const data = res.data || {};
    return { ok: Boolean(data.success), codes: data["error-codes"] || [] };
  } catch (err) {
    logger.warn?.("[turnstile] siteverify failed", { error: err.message });
    return { ok: false, codes: ["verify-unreachable"] };
  }
}

module.exports = { verifyToken };
