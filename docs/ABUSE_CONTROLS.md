# Abuse controls (Phase 27 §27d)

How Bonza limits abuse across three layers: application rate limits (real, cross-instance), an external-call
spend budget, and a Cloudflare edge/bot layer. Offline-by-default is preserved throughout — no Turnstile key
means challenges are skipped, and spend budgets only bind the real outbound branches (mock offline).

## 1. Application rate limits (shared Postgres store)

Every `express-rate-limit` instance in `src/backend/server.js` is backed by `utils/rateLimitStore.js`
(`PrismaRateLimitStore`), writing to the `RateLimitHit` table. This replaces the per-process memory store, so
a limit can't be reset by landing on another instance. The store is **fail-open** — a DB error allows the
request (a limiter hiccup must never 500 the site). Expired rows are swept nightly by `rate_limit_cleanup`.

| Limiter          | Window | Max | Key      | Scope                                             |
| ---------------- | ------ | --- | -------- | ------------------------------------------------- |
| `ip_global`      | 1 min  | 300 | IP       | all `/api/v1/*` (crude-flood ceiling)             |
| `ip_public`      | 1 min  | 60  | IP       | public data routers (destinations/explore/price-calendar/help/status) |
| `optimize`       | 1 hr   | 20  | user/IP  | `POST /optimize`                                  |
| `chat`           | 1 min  | 30  | user/IP  | `POST /chat`                                      |
| `search`         | 5 min  | 60  | user/IP  | `POST /search`                                    |
| `recs`           | 5 min  | 10  | user/IP  | `GET /recommendations`                            |
| `loyalty_sync`   | 1 hr   | 3   | user/IP  | `POST /loyalty/sync-now|sync-email`               |
| `manual_loyalty` | 1 hr   | 20  | user/IP  | `POST /loyalty/accounts`                          |
| `onboarding`     | 1 hr   | 3   | user/IP  | `PATCH /user/profile` (onboardingComplete flips)  |
| `bookings`       | 1 hr   | 30  | user/IP  | `/bookings`                                       |
| `assistant`      | 1 hr   | 20  | user/IP  | `POST /support/assistant`                         |

Numbers are tunable in `server.js`. Webhooks and `/health` are mounted before the global limiter and are
intentionally exempt.

## 2. External-call spend budget (`SpendLedger`)

`services/spendLedger.js` `tryConsume(service, { reserved })` enforces a **global per-service daily budget**
(UTC key) on the REAL outbound branches only — seats.aero (`searchAwardFlights`), Duffel **search**
(`searchFlights`/`searchHotels`, never bookings), and Claude (optimize/chat, support assistant, review
insights, nightly personalisation). The interactive share is capped at `budget × (1 − SPEND_RESERVE_FRACTION)`;
nightly jobs pass `reserved: true` to draw on the reserved slice. When the interactive share is exhausted the
caller serves cached/mock, and the first denial of the day emits `[metric] BonzaSpendExhausted Service=…`
(→ a CloudWatch metric-filter alarm in infra). Budgets come from `env.SPEND_BUDGETS` (`.env.example`).

## 3. Cloudflare edge / Turnstile (to configure at the edge)

- **Turnstile** (bot challenge) gates the two human entry points: the public support-contact form
  (`POST /support/tickets`, verified server-side — fail = `BOT_CHECK_FAILED`) and the signup pre-gate
  (`POST /security/turnstile/verify`, which reveals the Clerk form). Both are no-ops without a Turnstile key.
- **WAF rate rules** at the edge should mirror/precede the app limits (per-IP ceilings) so floods are dropped
  before they reach origin.
- **Keep open + cached:** the country/city/explore pages and other public GET pages stay publicly reachable
  and edge-cached — do **not** challenge them. The `ip_public` app limiter is only the origin API ceiling.
