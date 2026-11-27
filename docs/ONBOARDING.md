# Onboarding — clone to running in under an hour

Phase 27 §27l. Get a new engineer from `git clone` to a running app, and know the deploy/rollback path. Bonza is
**offline-by-default**: the only keys you *must* have are Clerk test keys (auth has no offline mock); everything
else (Duffel, Stripe, Seats.aero, Resend, Gmail/Outlook, SQS, PostHog) falls back to deterministic mocks.

## Prerequisites
- Node 20+, Docker (for Postgres), and git. That's it for local dev.
- A Clerk **test** instance (free) → its publishable + secret keys.

## Run it (≈15 min)
```bash
git clone <repo> && cd bonza
docker compose up -d                 # Postgres on :5432 (bonza / bonza_dev)
cp .env.example .env                 # then paste your Clerk TEST keys (see below)
npm install
npm run db:setup && npm run db:seed  # prisma db push + seed the demo user + data
npm run dev                          # backend on :5000
npm --prefix src/frontend run dev    # frontend on :3000 (separate terminal)
```
Open http://localhost:3000. You're signed in as the seeded demo user via the dev auth fallback.

### The keys that actually matter
Required to boot (no offline fallback): `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`. `DATABASE_URL` must match `docker-compose`. Everything else in `.env.example` is optional —
absent keys use mocks. **Never commit `.env`.**

## Verify your setup (≈10 min)
```bash
npm run lint          # ESLint — must be 0 errors
npm test              # vitest: backend unit + integration (needs Docker Postgres up) + frontend
npm run check:no-float  # schema guard (also runs as pretest)
```
Integration tests use a separate `bonza_test` DB (auto `db push` in global setup, truncate-reset per test). If
they can't reach Postgres, `docker compose up -d` first.

### Infra (optional, no AWS account needed)
```bash
cd infra && npm install
npx tsc --noEmit
npx cdk synth -c env=development   # synth-only; never 'cdk deploy' from a laptop
```

## How the codebase is laid out
- `src/backend/` — Node/Express (**CommonJS**). `api/` routes, `services/` logic, `jobs/` + `lambda/` background
  work, `config/` env + CSP, `db/schema.prisma` is the source of truth.
- `src/frontend/` — React 18 + Vite (**JSX, no TS** — ADR 0005). `pages/`, `components/`, `utils/`.
- `src/shared/format.js` — the one money/points formatter (CJS, used by both tiers).
- `infra/` — AWS CDK (TypeScript, ADR 0004). One stack per env.
- `docs/` — this folder: `runbooks/`, `adr/`, `SLOS.md`, `DB_ROLES.md`, `ABUSE_CONTROLS.md`, `compliance.md`.
- `test/` — `unit/`, `integration/`, factories + helpers. E2E is Playwright (separate).
- **Start reading** at `CLAUDE.md` (the working summary) → `FULL_CLAUDE.md` (the full spec) → the ADRs.

## Conventions you must know
- **Offline-by-default** — gate every external call behind an `env` flag with a mock fallback.
- **Money is integer pence** end-to-end (§27b); never `Float`. Format only via `src/shared/format.js`.
- **No hand-editing money** — `BonzaCredit` + `AuditEvent` are append-only at the DB (§27h/§27k); corrections are
  compensating rows through the service.
- **No emoji in UI chrome** — inline SVG icons only.
- One `request_id` threads every log line / Sentry event / job (§27i).

## Deploy & rollback
Deploys run from **CI only** (`.github/workflows/staging.yml`, `production.yml`) — never `cdk deploy` from a
laptop. The pipeline: test (lint + coverage + `npm audit --audit-level=high` + SBOM, §27j) → e2e → CDK deploy.
- **Order & DNS:** `DEPLOYMENT.md` (deploy order, Cloudflare records, acceptance checklist).
- **Migrations:** prod/staging run `prisma migrate deploy` on startup (gated, fatal on failure). Dev uses
  `db push`. See `docs/DB_ROLES.md` for the role/cutover + `CREATE INDEX CONCURRENTLY` note.
- **Rollback:** redeploy the previous green image/stack via the pipeline (the Fargate service has a deploy
  **circuit breaker with rollback**, so a failed deploy self-reverts). For data, PITR per
  [runbooks/db-failover.md](runbooks/db-failover.md). CSP is **report-only** until the documented enforce cutover
  (`CSP_ENFORCE=true` + the CloudFront header swap, §27j).

## When something breaks
Go to [runbooks/](runbooks/) — start with [on-call.md](runbooks/on-call.md) for what's a page vs. a morning
ticket, then the specific runbook. Grab the `request_id` first.
