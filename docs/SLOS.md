# Service Level Objectives & Observability (Phase 27 §27i)

How Bonza is observed in production: the correlation id that threads a request end-to-end, the SLOs we hold
ourselves to, and the CloudWatch alarms/dashboards that watch them. Infra here is defined in
`infra/lib/constructs/monitoring.ts` + `api.ts` and verified by `cdk synth` (not yet deployed).

## Correlation id (`request_id`)

Every request opens an `AsyncLocalStorage` context in `middleware/requestId.js`:

- An inbound `x-request-id` header is accepted if it is a sane token (`^[A-Za-z0-9_-]{1,128}$`); otherwise a
  UUID is minted. The id is echoed back on the response `x-request-id` header.
- It is stamped onto **every log line** (the pino `mixin` in `utils/logger.js`), the **Sentry scope**
  (`setTag("request_id", …)`), and **outbound call headers** (`X-Request-Id` to Seats.aero and Anthropic;
  the Duffel SDK manages its own transport and is not threaded).
- Background jobs get their own id per run (`utils/jobRunner.js` runs the body inside the same context), which
  is also persisted on `JobRun.requestId` — so an admin can trace a nightly job's logs by its run id.
- `AuditEvent.requestId` (§27k) will read the same `requestContext.getRequestId()` once that table exists.

Logs are structured JSON (pino) to stdout only — no network, so dev/offline is unaffected. A `redact` list
scrubs `authorization`/`cookie`/`password`/`token`/`secret`/`email`/`membershipNumber`/`accountNumber`/
`balance`/`pii.*` (and the same keys one level deep) before anything is written.

## SLOs

| SLO | Objective | Window | Source | Alarm |
|-----|-----------|--------|--------|-------|
| **Search/API availability** | ≥ 99.5% non-5xx | 30-day budget, multi-window burn | ALB `HTTPCode_ELB_5XX_Count` / `RequestCount` | burn-rate composites (below) |
| **API latency** | p95 < 4s | 5-min, 3 periods | ALB `TargetResponseTime` p95 | `ApiLatencySloAlarm` |
| **Booking → confirm** | > 97% success | — | app `[metric]` line (follow-up) | pending a `BonzaBookingOutcome` emit |
| **Statement parse** | > 95% / programme | 24h, ≥ 5 attempts | §27c `parseStatsJob` + `ParseAttempt` | §27c parse-stats alarm (< 80%/24h) |
| **Nightly jobs** | 100% success | per run | app `[metric] BonzaJobOutcome` → `JobFailure` filter | `NightlyJobFailureAlarm` |

### Availability burn-rate alarms (multi-window, multi-burn-rate)

Error budget = 1 − 0.995 = **0.5%**. We page only when a short **and** a long window both breach, which
suppresses noise while catching both a sudden outage and a slow bleed (Google SRE workbook thresholds):

- **Fast burn** — 14.4× budget (≈ 7.2% 5xx) over **1h AND 5m** → `bonza-<env>-slo-fast-burn` → **page now**.
- **Slow burn** — 6× budget (≈ 3% 5xx) over **6h AND 30m** → `bonza-<env>-slo-slow-burn` → **investigate today**.

Each window is a CloudWatch `MathExpression` (`100 * errors / requests`); the two per tier are combined with a
`CompositeAlarm` (`allOf`). Missing data (no requests) is treated as not-breaching.

## Dependency health, spend & job metrics

The app emits structured `[metric]` log lines (`{ metric, service?, value }`); `monitoring.ts` turns them into
CloudWatch metrics via **log metric filters** on the API log group (`/bonza/<env>/api`), namespace
`Bonza/<env>`, so no CloudWatch SDK sits in the request path:

| Metric line | CW metric | Emitted by | Alarm |
|-------------|-----------|------------|-------|
| `BonzaServiceDegraded` | `ServiceDegraded` | `services/serviceHealth.js` | `DependencyDegradedAlarm` (degraded ~15 min) |
| `BonzaSpendExhausted` | `SpendExhausted` | `services/spendLedger.js` | `SpendExhaustedAlarm` (any exhaustion/day) |
| `BonzaJobOutcome` (value 0/1) | `JobFailure` / `JobSuccess` | `utils/jobRunner.js` | `NightlyJobFailureAlarm` |

A **dependency-health dashboard** (`bonza-<env>-dependencies`) shows availability (5xx %), p95 latency,
dependency-degraded state, daily spend exhaustion, and job success/failure counts in one view.

## Error-budget policy

- **Fast-burn page** → treat as an incident; halt risky deploys until availability recovers.
- **Slow-burn** → investigate same day; if the 30-day budget is < 25% remaining, freeze feature deploys and
  spend the budget on reliability until it recovers.
- Latency or dependency alarms that don't also burn the availability budget are **investigate**, not page.

## Follow-ups

- `booking → confirm` SLO needs a `[metric] BonzaBookingOutcome` emit on confirm/fail in `bookingWriter`; the
  metric filter + alarm then mirror the job-outcome pattern above.
- A "no nightly-job success in 26h" absence alarm (on `JobSuccess` with `treatMissingData=BREACHING`) can be
  added once run cadence per job is pinned.
