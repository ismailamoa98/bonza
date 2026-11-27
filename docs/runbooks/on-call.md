# On-call alarm policy

Phase 27 §27l. Which alarms page you at 3am vs. which wait for the morning. All alarms publish to the shared SNS
topic `bonza-<env>-alerts` (`infra/lib/constructs/monitoring.ts` + the §27g queue DLQ alarms). Tune the routing
(PagerDuty/Opsgenie urgency) to match this table.

## Wake someone (page immediately)

Money is at risk, data could be corrupted, or the product is down for everyone:

- **SLO fast-burn** (`bonza-<env>-slo-fast-burn`) — availability error budget burning 14.4× (1h+5m). The site is
  effectively down. → [db-failover](db-failover.md) / [duffel-outage](duffel-outage.md) depending on the cause.
- **ALB 5xx > 10 / 5 min** or **RDS CPU sustained** / **RDS connections > 70%** — API tier failing or DB saturating.
- **Any `*-dlq` DLQ alarm for `email` / `data_export` / `person_delete`** (§27g) — a consumer has failed a message
  3×. Email is user-facing; data_export/person_delete are legal obligations (DSAR/erasure).
- **Suspected data breach** — not an automated alarm; any human signal starts [data-breach](data-breach.md) and
  the 72h clock **now**.

## Morning is fine (ticket, business hours)

Degraded but contained — the mock/fallback is covering, or it's a single user:

- **SLO slow-burn** (`bonza-<env>-slo-slow-burn`, 6× over 6h+30m) — investigate same day.
- **`BonzaServiceDegraded`** for Duffel/Seats.aero/Claude — the feature is serving cached/mock; see the matching
  outage runbook, but it's not an outage.
- **`BonzaSpendExhausted`** (§27d) — a daily external-spend budget hit; usually a scraper. Check rate limits.
- **`NightlyJobFailureAlarm`** / repeated lease-held — a background job erred; re-run via the Lambda, check
  `/admin/jobs`.
- **Parser success < 80%/24h** (§27c) — a statement format changed; triage `/admin/parsers`, no user data is wrong
  (suspicious reads were quarantined, not applied).
- **p95 latency SLO (4s)** without a burn alarm — performance regression, not an outage.
- **A single disputed balance / credits / chargeback** — the per-user runbooks.

## Principles

- **Offline-by-default means a dependency outage is rarely a page.** If Duffel is down and the app is 500ing
  (not serving the mock/degraded state), *that* is the page — the gating broke.
- **Never hand-edit money.** Post compensating rows through the services (§27k audit covers every change).
- **One `request_id` traces everything.** Start there before you guess.
