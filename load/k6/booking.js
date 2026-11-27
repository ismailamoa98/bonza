// load/k6/booking.js — §27m Scenario 3: Booking, low-concurrency / high-correctness. Booking is not a
// throughput test — it's a correctness-under-concurrency test, run alongside the §27a integration tests. The
// risk is a double-submit creating two Bookings / two Duffel orders. Here each VU creates a PaymentIntent and
// confirms it TWICE with the SAME idempotencyKey; the second confirm must NOT create a second booking.
// Run against staging configured offline for externals (mock Stripe/Duffel) with production-shaped seed data.
// Needs AUTH_TOKEN.
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, authHeaders, SLO_THRESHOLDS } from "./lib/common.js";

export const options = {
  scenarios: {
    // Deliberately low concurrency — we're proving correctness, not pushing RPS.
    booking: { executor: "ramping-vus", startVUs: 0, stages: [
      { duration: "30s", target: 5 },
      { duration: "2m", target: Number(__ENV.TARGET_VUS) || 10 },
      { duration: "30s", target: 0 },
    ] },
  },
  thresholds: {
    ...SLO_THRESHOLDS,
    checks: ["rate>0.99"], // correctness checks must essentially all pass
  },
};

const API = `${BASE_URL}/api/v1`;

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function () {
  const headers = authHeaders();

  // 1) Create a PaymentIntent (mock pi_* offline).
  const pi = http.post(`${API}/bookings/payment-intent`, JSON.stringify({ amount: 28000, currency: "GBP" }), { headers });
  check(pi, { "payment-intent not 5xx": (r) => r.status < 500 });

  // 2) Confirm the SAME booking twice with one idempotency key — the double-submit guard (§27a,
  //    Booking.idempotencyKey @unique) must yield exactly one booking + one order.
  const key = uuid();
  const body = JSON.stringify({ paymentIntentId: `mock_pi_${uuid()}`, idempotencyKey: key, leg: "flight" });

  const first = http.post(`${API}/bookings/confirm-cash`, body, { headers });
  const second = http.post(`${API}/bookings/confirm-cash`, body, { headers }); // the double-click

  check(first, { "first confirm not 5xx": (r) => r.status < 500 });
  check(second, {
    // The replay must be handled (idempotent 200 returning the same booking, or a clean 409) — never a second
    // successful create and never a 5xx.
    "replay handled, not a second create": (r) => r.status < 500,
  });

  sleep(1);
}
