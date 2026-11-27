// load/k6/lib/common.js — Phase 27 §27m. Shared helpers for the k6 scenarios: the target base URL, auth
// headers, and the SLO thresholds that mirror docs/SLOS.md (availability 99.5%, p95 < 4s). Everything is driven
// by env vars so the same scripts run against a local stack or staging.
//
//   BASE_URL   — e.g. https://staging.bonza.app  (default http://localhost:5000)
//   AUTH_TOKEN — a Clerk session JWT for the authed scenarios (search/booking). Omit for browse-only.

export const BASE_URL = (__ENV.BASE_URL || "http://localhost:5000").replace(/\/$/, "");

export function authHeaders() {
  const h = { "Content-Type": "application/json", Accept: "application/json" };
  if (__ENV.AUTH_TOKEN) h.Authorization = `Bearer ${__ENV.AUTH_TOKEN}`;
  return h;
}

// SLO-aligned thresholds. A run that breaches these is a FAIL — record the concurrency at which it first breaks.
export const SLO_THRESHOLDS = {
  http_req_failed: ["rate<0.005"], // availability SLO 99.5%
  http_req_duration: ["p(95)<4000"], // latency SLO p95 < 4s
};

// A standard ramp: warm up, hold at the target, ramp down. Override the hold with TARGET_VUS / HOLD.
export function ramp(targetVus) {
  const target = Number(__ENV.TARGET_VUS) || targetVus;
  const hold = __ENV.HOLD || "3m";
  return [
    { duration: "1m", target: target },
    { duration: hold, target: target },
    { duration: "30s", target: 0 },
  ];
}
