// utils/logger.js — Phase 27 §27i. Structured JSON logging on pino, to stdout only (no network — offline
// safe). Two things are layered on top of the raw pino instance:
//   1. A `mixin` that stamps the correlation `request_id` (and `userId`, once auth resolves it) from the
//      AsyncLocalStorage context onto EVERY line, so a single id threads a whole request across every log.
//   2. A `redact` list so secrets/PII (auth headers, cookies, tokens, emails, membership numbers, balances,
//      pii.*) never reach the logs.
// The public shape — info/warn/error/setUser — and the Sentry behaviour (breadcrumb on warn, captureException
// on error, setUser) are preserved exactly, so the ~40 call sites and instrument.js are unchanged.
const pino = require("pino");
const Sentry = require("@sentry/node");
const env = require("../config/env");
const requestContext = require("./requestContext");

// Quiet in tests; info by default; LOG_LEVEL overrides (e.g. "debug" locally, "warn" to dial prod down).
const level = process.env.LOG_LEVEL || (env.NODE_ENV === "test" ? "silent" : "info");

// Exposed (via logger._pinoOptions) so tests can build a pino with the REAL redact/mixin config against a
// capture stream, rather than duplicating the config or fighting the default fd-1 destination.
const pinoOptions = {
  level,
  base: { service: "bonza-backend", env: env.NODE_ENV },
  // Stamp the correlation context onto every line.
  mixin() {
    const ctx = requestContext.get();
    if (!ctx) return {};
    const out = { request_id: ctx.requestId };
    if (ctx.userId) out.userId = ctx.userId;
    return out;
  },
  redact: {
    paths: [
      "authorization",
      "cookie",
      "set-cookie",
      "password",
      "token",
      "apiKey",
      "secret",
      "email",
      "emails",
      "membershipNumber",
      "accountNumber",
      "balance",
      "pii",
      "*.authorization",
      "*.cookie",
      "*.password",
      "*.token",
      "*.apiKey",
      "*.secret",
      "*.email",
      "*.membershipNumber",
      "*.accountNumber",
      "*.balance",
    ],
    censor: "[redacted]",
  },
};

const pinoLogger = pino(pinoOptions);

const logger = {
  info: (message, meta = {}) => {
    pinoLogger.info(meta, message);
  },

  warn: (message, meta = {}) => {
    pinoLogger.warn(meta, message);
    Sentry.addBreadcrumb({ message, level: "warning", data: meta });
  },

  error: (message, error, meta = {}) => {
    pinoLogger.error({ err: error, ...meta }, message);
    Sentry.captureException(error, { extra: { message, ...meta } });
  },

  setUser: (userId) => {
    Sentry.setUser({ id: userId });
    requestContext.set("userId", userId);
  },

  // Exposed for tests / advanced callers that want the raw pino instance (child loggers, levels, etc.).
  _pino: pinoLogger,
  _pinoOptions: pinoOptions,
};

module.exports = { logger };
