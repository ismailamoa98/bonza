# Database roles, pooling & migration safety (Phase 27 §27h)

## Least-privilege roles

The roles migration `20261102300000_phase27h_db_roles_and_grants` creates three Postgres roles (idempotent;
roles are cluster-global). It only runs in prod/staging via `prisma migrate deploy` — dev uses `db push` and
connects as the `bonza` master user.

| Role             | Privileges                                                                 | Used by                     |
| ---------------- | -------------------------------------------------------------------------- | --------------------------- |
| `bonza_app`      | SELECT/INSERT/UPDATE/DELETE on all tables (+ future) — **except** no UPDATE/DELETE on append-only `BonzaCredit` (and `AuditEvent`, §27k) | the API + jobs at runtime   |
| `bonza_migrate`  | DDL (owns schema); `statement_timeout=300s`, `lock_timeout=10s`, `idle_in_transaction_session_timeout=60s` | `prisma migrate deploy`     |
| `bonza_readonly` | SELECT only (+ future tables)                                              | analytics / debugging       |

Append-only tables are enforced at the database, not just in code: a bug or a compromised app credential
**cannot** rewrite the credits ledger. Corrections are posted as new (negative) `BonzaCredit` rows. The §27k
`AuditEvent` trail is the same — `bonza_app` has SELECT/INSERT but not UPDATE/DELETE (migration
`20261102...27k`). Its **7-year retention prune** (`jobs/retentionJob.js`) therefore cannot run as `bonza_app`;
schedule that sweep to connect as `bonza_migrate`. (Dev/`db push` doesn't enforce roles, so it runs as-is.)

### Credential store + go-live cutover

Per-role passwords live in Secrets Manager (`/bonza/<env>/db-bonza_app|bonza_migrate|bonza_readonly`, created
by the `Database` construct). They are **not** set in the migration. Cutover (once, at go-live, after the roles
migration has run):

1. Apply each secret's password to its role: `ALTER ROLE bonza_app WITH PASSWORD '<from secret>'` (etc.).
2. Point the app's `DATABASE_URL` at the `bonza_app` secret and the migrate step at `bonza_migrate`
   (the Dockerfile entrypoint runs `migrate deploy` before starting the app — give that step the migrate URL).
3. Enable rotation on the three secrets (hosted PostgreSQL single-user rotation against the RDS Proxy endpoint).

Until cutover, both the app and migrations connect as the `bonza` master user **through the RDS Proxy** — the
roles/grants exist and are testable, but the privilege separation isn't load-bearing yet.

## Connection pooling (RDS Proxy)

Every consumer connects to the **RDS Proxy** (`Database.proxy`), never the instance directly:

- API Fargate tasks: `…@<proxy>:5432/bonza?connection_limit=5&pool_timeout=20&sslmode=require`
- Jobs Lambda: `connection_limit=2` (one modest unit of work per invocation)

The proxy multiplexes these onto a bounded server-side pool (`maxConnectionsPercent=90`), so scaling out tasks
or a burst of Lambda invocations can't exhaust Postgres `max_connections` (100). `requireTLS` ⇒ `sslmode=require`.
Alarm: RDS `DatabaseConnections` > **70%** of max (`monitoring.ts`) — a breach means a leak or the proxy pool
needs tuning.

## Migration safety

- The `bonza_migrate` role carries `statement_timeout` / `lock_timeout` so a runaway migration fails fast
  instead of holding `ACCESS EXCLUSIVE` locks and wedging the app.
- **`CREATE INDEX CONCURRENTLY`**: for an index on a large, live table, put it in its **own** migration with no
  other statements. `CONCURRENTLY` cannot run inside a transaction, and Prisma wraps each migration in one, so
  this is applied as a **manual/runbook step** (run the single statement out-of-band, then mark the migration
  applied) rather than through `migrate deploy`. Small/new tables (all Phase-27 additions) index fine inline.

## Point-in-time recovery (PITR) + RTO/RPO

RDS automated backups are on (`backupRetention` = 1d dev / 7d staging / 30d prod, `deleteAutomatedBackups:
false`), which gives **PITR to any second within the retention window**. Production is Multi-AZ.

| Target | Value | Basis |
| ------ | ----- | ----- |
| **RPO** (max data loss) | ≤ 5 min | RDS transaction-log shipping for PITR |
| **RTO** (time to restore) | ≤ 1 hour | restore latest-restorable-time to a new instance + repoint `DATABASE_URL` |
| Multi-AZ failover (prod) | 60–120 s | automatic, no data loss |

Restore drill: `aws rds restore-db-instance-to-point-in-time --source-db-instance-identifier <db>
--target-db-instance-identifier <db>-restore --use-latest-restorable-time`, then repoint the proxy/app. This
belongs in the DB-failover runbook (§27l).
