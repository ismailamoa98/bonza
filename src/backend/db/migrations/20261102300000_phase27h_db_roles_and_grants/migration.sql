-- Phase 27 §27h — least-privilege database roles + the §27a append-only REVOKE.
-- Three roles with distinct privilege sets, so the running application can never DDL and can never mutate the
-- append-only ledger, migrations run under a role with safety timeouts, and analytics/debugging connects
-- read-only. Role creation is idempotent (roles are cluster-global, and this migration is re-applied to a
-- fresh shadow DB on every `prisma migrate diff`). Passwords are NOT set here — they are attached operationally
-- from Secrets Manager (`ALTER ROLE … WITH PASSWORD`), rotated by the infra rotation schedule.
--
-- This migration adds no tables/columns, so it is schema-diff-neutral (the migrate-diff checks stay empty).

-- ── Roles (idempotent) ───────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bonza_app') THEN
    CREATE ROLE bonza_app WITH LOGIN; -- the application connection role
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bonza_migrate') THEN
    CREATE ROLE bonza_migrate WITH LOGIN; -- runs `prisma migrate deploy` (DDL)
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bonza_readonly') THEN
    CREATE ROLE bonza_readonly WITH LOGIN; -- analytics / debugging (SELECT only)
  END IF;
END
$$;

-- ── Migration safety: bound how long DDL can run / wait for a lock (§27h) ──────
-- A runaway migration can't hold ACCESS EXCLUSIVE locks indefinitely; it fails fast instead of wedging the app.
ALTER ROLE bonza_migrate SET statement_timeout = '300s';
ALTER ROLE bonza_migrate SET lock_timeout = '10s';
ALTER ROLE bonza_migrate SET idle_in_transaction_session_timeout = '60s';

-- ── Schema usage ──────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO bonza_app, bonza_readonly;
GRANT ALL   ON SCHEMA public TO bonza_migrate;

-- ── bonza_readonly: SELECT on everything, now and in future ────────────────────
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bonza_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bonza_readonly;

-- ── bonza_app: full DML on everything, now and in future (append-only carved out below) ──
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bonza_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bonza_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bonza_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO bonza_app;

-- ── bonza_migrate: owns/alters schema (DDL) ────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bonza_migrate;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bonza_migrate;

-- ── §27a append-only ledger: the app may INSERT (compensating rows) + SELECT, never UPDATE/DELETE ──
-- Corrections to BonzaCredit are posted as new (negative) rows, never edits. The AuditEvent table gets the
-- same treatment in its own migration (§27k) once it exists.
REVOKE UPDATE, DELETE ON "BonzaCredit" FROM bonza_app;
