// load/k6/browse.js — §27m Scenario 1: Browse. The public, unauthenticated, read-heavy surface — the homepage
// discovery rails, the Explore map data, a country page, and the price calendar. This is the traffic shape a
// launch/marketing spike looks like. No auth needed. These routes are public + cached (Cloudflare), so this
// also sanity-checks the publicDataLimiter (§27d) and the read path under load.
import http from "k6/http";
import { check, group, sleep } from "k6";
import { BASE_URL, SLO_THRESHOLDS, ramp } from "./lib/common.js";

export const options = {
  scenarios: {
    browse: { executor: "ramping-vus", startVUs: 0, stages: ramp(50) },
  },
  thresholds: SLO_THRESHOLDS,
};

const API = `${BASE_URL}/api/v1`;

export default function () {
  group("discovery", function () {
    const hero = http.get(`${API}/destinations/hero`);
    check(hero, { "hero 200": (r) => r.status === 200 });

    const discover = http.get(`${API}/destinations/discover?origin=LHR`);
    check(discover, { "discover 200": (r) => r.status === 200 });
  });

  group("explore", function () {
    const explore = http.get(`${API}/explore?origin=LHR`);
    check(explore, { "explore 200": (r) => r.status === 200 });

    const country = http.get(`${API}/explore/JP?origin=LHR&month=6&nights=5&adults=2`);
    check(country, { "country 200": (r) => r.status === 200 });
  });

  group("calendar", function () {
    const cal = http.get(`${API}/price-calendar?from=LHR&to=JFK&month=2026-06`);
    check(cal, { "calendar 200": (r) => r.status === 200 });
  });

  sleep(Math.random() * 2 + 1); // 1–3s think time between page views
}
