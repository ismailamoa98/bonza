// services/serviceHealth.js — Phase 24 §24f. Per-dependency failure state machine. Crossing the threshold
// flips the mapped ServiceStatus row to 'degraded' (the /status page + the inline amber banners both read
// this one table — one source of truth); a clean window flips it back. Only the REAL outbound paths call
// this; offline/mock paths never fail here.
//
// NOTE (divergence): a system degradation isn't a per-user event and UserEvent requires a userId, so instead
// of writing UserEvent we flip ServiceStatus, log to Sentry (via logger), and emit a structured metric line
// a CloudWatch Logs metric-filter turns into `BonzaServiceDegraded` (the §11 alarm source).
const prisma = require("../config/database");
const { logger } = require("../utils/logger");

const THRESHOLD = { failures: 5, windowMs: 2 * 60 * 1000 };

// internal service key (also the analytics `service` value) -> ServiceStatus.service row
const SERVICE_MAP = {
  duffel: "flight_search",
  duffel_stays: "hotel_search",
  rooms_aero: "hotel_search",
  seats_aero: "award_search",
  stripe: "payments",
  claude: "assistant",
  resend: "email",
};

// in-memory sliding windows + last-known DB state (avoids redundant writes)
const failures = new Map(); // service -> [timestamps]
const lastSuccess = new Map(); // service -> timestamp
const dbState = new Map(); // service -> 'operational' | 'degraded'

function prune(list, now) {
  const cutoff = now - THRESHOLD.windowMs;
  while (list.length && list[0] < cutoff) list.shift();
  return list;
}

async function setState(service, state, message) {
  const row = SERVICE_MAP[service];
  if (!row) return;
  if (dbState.get(service) === state) return; // no change — skip the write
  dbState.set(service, state);
  try {
    await prisma.serviceStatus.update({ where: { service: row }, data: { state, message: message || null } });
  } catch (err) {
    logger.warn?.("[serviceHealth] ServiceStatus update failed", { service, row, error: err.message });
  }
}

async function recordFailure(service, { code, status } = {}) {
  const now = Date.now();
  const list = prune(failures.get(service) || [], now);
  list.push(now);
  failures.set(service, list);

  if (list.length >= THRESHOLD.failures) {
    logger.error(`[serviceHealth] ${service} degraded`, null, { service, code, status, failures: list.length });
    // structured metric line for the CloudWatch Logs metric-filter → BonzaServiceDegraded{Service=<service>}
    logger.info?.(`[metric] BonzaServiceDegraded Service=${service} Value=1`);
    await setState(service, "degraded", "We’re seeing problems with this service and are on it.");
  }
}

async function recordSuccess(service) {
  const now = Date.now();
  lastSuccess.set(service, now);
  // a clean window (no failures within windowMs) clears a degraded state
  const list = prune(failures.get(service) || [], now);
  failures.set(service, list);
  if (dbState.get(service) === "degraded" && list.length === 0) {
    logger.info?.(`[metric] BonzaServiceDegraded Service=${service} Value=0`);
    await setState(service, "operational", null);
  }
}

// Convenience: wrap a real outbound call so failures/successes feed the machine. `fn` should throw on failure.
async function tracked(service, fn, meta = {}) {
  try {
    const out = await fn();
    await recordSuccess(service);
    return out;
  } catch (err) {
    await recordFailure(service, { code: err?.code, status: err?.status ?? err?.response?.status, ...meta });
    throw err;
  }
}

// test-only: clear the in-memory windows between cases
function __reset() {
  failures.clear();
  lastSuccess.clear();
  dbState.clear();
}

module.exports = { recordFailure, recordSuccess, tracked, SERVICE_MAP, THRESHOLD, __reset };
