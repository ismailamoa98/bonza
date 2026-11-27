// middleware/requestId.js — Phase 27 §27i. Opens the correlation context for every request: it accepts a
// caller-supplied `x-request-id` (sanitised) or mints one, echoes it on the response, tags the Sentry scope,
// and runs the rest of the request inside requestContext.run() so every downstream log line / Sentry event /
// outbound call header carries the same id. Mounted FIRST (before the raw-body webhooks and the json parser)
// so the whole pipeline — webhooks included — is inside a context.
const crypto = require("node:crypto");
const env = require("../config/env");
const requestContext = require("../utils/requestContext");
const { hashIp } = require("../services/legalAcceptance"); // §25d — sha256(ip+APP_SALT); raw IP never stored

// Accept only a sane, bounded, token-ish id from the client; otherwise mint our own (prevents header
// injection / log forging via a crafted x-request-id).
const VALID_ID = /^[A-Za-z0-9_-]{1,128}$/;

function requestId(req, res, next) {
  const inbound = req.headers["x-request-id"];
  const id = typeof inbound === "string" && VALID_ID.test(inbound) ? inbound : crypto.randomUUID();

  req.id = id;
  res.setHeader("x-request-id", id);

  // Tag the Sentry isolation scope for this request (no-op without a DSN). Lazy require so instrument.js /
  // env.hasSentry stays the single init gate.
  if (env.hasSentry) {
    try {
      require("@sentry/node").getCurrentScope().setTag("request_id", id);
    } catch {
      /* Sentry not initialised — ignore */
    }
  }

  // §27k — carry a hashed client ip on the context so auditService can record provenance without threading req.
  const fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ipHash = hashIp(fwd || req.ip || req.socket?.remoteAddress || "");

  requestContext.run({ requestId: id, ipHash }, () => next());
}

module.exports = { requestId };
