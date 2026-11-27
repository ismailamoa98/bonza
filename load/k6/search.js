// load/k6/search.js — §27m Scenario 2: Search with stubbed externals. The authed, compute-heavier path: the
// unified cash+points search and the trip optimiser. Run against staging configured OFFLINE for externals
// (no Duffel/Seats.aero/Claude keys) so the third parties are the deterministic mocks — we're load-testing
// OUR search/optimise + DB + rate-limit store, not Duffel's API. Needs AUTH_TOKEN (a Clerk session JWT).
import http from "k6/http";
import { check, group, sleep } from "k6";
import { BASE_URL, authHeaders, SLO_THRESHOLDS, ramp } from "./lib/common.js";

export const options = {
  scenarios: {
    search: { executor: "ramping-vus", startVUs: 0, stages: ramp(30) },
  },
  thresholds: {
    ...SLO_THRESHOLDS,
    // Search is heavier than browse; still hold the 4s SLO but watch this number closely.
    "http_req_duration{group:::search}": ["p(95)<4000"],
  },
};

const API = `${BASE_URL}/api/v1`;

const ROUTES = [
  { from: "LHR", to: "JFK" },
  { from: "LHR", to: "NRT" },
  { from: "MAN", to: "DXB" },
  { from: "LGW", to: "LIS" },
];

export default function () {
  const r = ROUTES[Math.floor(Math.random() * ROUTES.length)];
  const headers = authHeaders();

  group("search", function () {
    const res = http.post(
      `${API}/search`,
      JSON.stringify({ origin: r.from, destination: r.to, departDate: "2026-06-12", returnDate: "2026-06-19", adults: 2 }),
      { headers }
    );
    check(res, {
      "search 200": (x) => x.status === 200,
      // On a budget/limit denial the API serves cached/mock, not a 5xx — assert we never hard-fail.
      "search not 5xx": (x) => x.status < 500,
    });
  });

  group("optimise-trip", function () {
    const res = http.post(
      `${API}/optimize/trip`,
      JSON.stringify({ legs: [{ origin: r.from, destination: r.to, date: "2026-06-12" }] }),
      { headers }
    );
    check(res, { "optimise not 5xx": (x) => x.status < 500 });
  });

  sleep(Math.random() * 2 + 1);
}
