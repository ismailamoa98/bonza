# Runbooks

Phase 27 §27l. One page per incident class: what you'll see, how to confirm it, how to stop the bleeding, and
how to clean up. Every runbook assumes you have the on-call tools (AWS console / CLI, the admin inspector
`/admin/user/:id` and `/admin/jobs`, the Sentry project, and CloudWatch for the `bonza-<env>` + the
`bonza-<env>-dependencies` dashboards).

**Golden rule:** Bonza is **offline-by-default** — every external integration is env-gated and falls back to a
mock (`config/env.js`). A dependency outage degrades a feature; it must never 500 the whole app. If it does,
that's the bug.

## Index

| Runbook | When |
|---------|------|
| [on-call.md](on-call.md) | Alarm policy — what wakes you vs. what waits for morning |
| [duffel-outage.md](duffel-outage.md) | Flight search/booking failing (Duffel) |
| [seatsaero-outage.md](seatsaero-outage.md) | Award availability failing (Seats.aero) |
| [stripe-outage.md](stripe-outage.md) | Payments / subscriptions failing (Stripe) |
| [db-failover.md](db-failover.md) | RDS failover, connection exhaustion, high CPU |
| [disputed-balance.md](disputed-balance.md) | A user says their points balance is wrong |
| [chargeback.md](chargeback.md) | A card chargeback / payment dispute |
| [credits-discrepancy.md](credits-discrepancy.md) | A user's Bonza Credits don't add up |
| [data-breach.md](data-breach.md) | Suspected personal-data breach (72h ICO clock) |

## Shared first moves

1. **Check the dependency dashboard** (`bonza-<env>-dependencies`) and `/status` — is a dependency already
   flagged `degraded` by `serviceHealth`?
2. **Check `/admin/jobs`** — are the nightly jobs green, or is something wedged on a lease?
3. **Grab a `request_id`** (§27i) from the user report or the Sentry event — every log line for that request
   carries it, so you can trace one request end-to-end (and into `JobRun`/`AuditEvent`).
4. **Don't mutate money by hand.** Balances and credits are append-only at the DB (§27h/§27k). Corrections are
   new compensating rows through the service, never `UPDATE`/`DELETE`.
