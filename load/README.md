# Load testing (Phase 27 §27m)

k6 scenarios that exercise Bonza under load before the beta gate. Three shapes, matching how the app is actually
hit: **browse** (public spike), **search** (authed compute), **booking** (correctness under concurrency). They
target the SLOs in [`docs/SLOS.md`](../docs/SLOS.md) — availability 99.5%, p95 < 4s — and the booking scenario
is run **with** the §27a concurrency integration tests, not instead of them.

## Why k6
Thresholds-as-code (a run that breaches the SLO exits non-zero), a clean JS API, and it runs as a single binary
or a Docker image — no npm dependency added to the app. Artillery would also work; k6's threshold model fit the
SLO gate better.

## Install
```bash
brew install k6            # macOS
# or: docker run --rm -i grafana/k6 run - < load/k6/browse.js
```

## Run against staging (the real target)
Point at **staging**, configured **offline for externals** (no Duffel/Seats.aero/Claude/Stripe keys) so the third
parties are the deterministic mocks — we load-test *our* code + DB + RDS Proxy pool + the shared rate-limit
store, not a vendor's API. Seed staging with **production-shaped data** (realistic row counts) first.

```bash
export BASE_URL=https://staging.bonza.app
export AUTH_TOKEN=<a Clerk session JWT>   # for search + booking (browse needs none)

k6 run load/k6/browse.js
k6 run load/k6/search.js
k6 run load/k6/booking.js
```

Tune load without editing the scripts: `TARGET_VUS=100 HOLD=5m k6 run load/k6/browse.js`.

### Getting an AUTH_TOKEN
The authed scenarios send `Authorization: Bearer <jwt>`. Mint a short-lived Clerk session JWT for a seeded
staging test user (Clerk dashboard → the user → "Impersonate"/session token, or the Clerk backend API). Never use
a production user or a long-lived token.

## What to record (for the beta gate)
For each scenario, capture from the k6 summary **and** the CloudWatch dashboards during the run:

| Metric | Where | Target |
|--------|-------|--------|
| p95 latency, and the **VU count where p95 first breaches 4s** | k6 `http_req_duration` + `bonza-<env>` dashboard | the headroom number |
| error rate | k6 `http_req_failed` | < 0.5% (never 5xx — offline falls back to mock) |
| **RDS connections** vs. max (pooling headroom) | `RdsConnectionsAlarm` metric | stays < 70% via the RDS Proxy (§27h) |
| RDS CPU | dashboard | class fit — does the instance class hold? |
| booking correctness | k6 `checks` on `booking.js` | replay never creates a second booking (§27a) |

Write the numbers into the release notes / `pre-go-live.md`: the **p95-breach concurrent-user figure**, whether
the RDS instance class fits, and the proxy pooling headroom. **Re-run all three before the beta gate** and after
any change to the search/booking path or the DB class.

## Notes
- These are **not** CI tests — they run on demand against a deployed staging env, not in the unit/integration
  suite (which stays offline + fast).
- `booking.js` is deliberately low-concurrency: it proves the double-submit guard, not throughput.
- If a scenario 5xxes, that's a real bug — offline-by-default means a dependency limit/outage degrades to a mock,
  it never 500s.
