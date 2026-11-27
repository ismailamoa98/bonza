# Runbook: Database failover / saturation

RDS Postgres (Multi-AZ in prod) behind an **RDS Proxy** (§27h). The API (Fargate) and jobs/consumer Lambdas all
connect through the proxy with a bounded `connection_limit`, so scale-out multiplexes onto a pool instead of
exhausting `max_connections` (100).

## Symptoms & alarms
- **`RdsConnectionsAlarm`** (> 70% of max) — connection pressure or a leak.
- **`RdsCpuAlarm`** (> 80% / 15 min) — slow queries or load.
- **`RdsFreeStorageAlarm`** / **`RdsFreeMemoryAlarm`** — capacity.
- Multi-AZ **failover**: a 60–120s blip of connection errors, then recovery (the proxy re-points to the new
  writer). SLO fast-burn may fire briefly.

## Confirm
- RDS console → the instance's events (failover shows as a DB event). Performance Insights for top SQL.
- Check the RDS Proxy target health. Check `pg_stat_activity` for connection count / long-running queries.

## Mitigate
- **Failover blip:** usually self-heals in ~1–2 min as the proxy fails over. Confirm the API tasks reconnected
  (they will via the proxy). RTO target ≤ 1h, RPO ≤ 5 min (PITR) — a failover is far inside that.
- **Connections > 70%:** the proxy should prevent exhaustion. If it's climbing, look for a connection leak
  (a code path not using the shared Prisma client) or a scale-out beyond the proxy's `maxConnectionsPercent`
  (90%). Scale the API down briefly or raise the instance's `max_connections` via the parameter group.
- **CPU pegged:** find the slow query in Performance Insights (`log_min_duration_statement=1000` logs > 1s). A
  missing index? Add it via a migration using **`CREATE INDEX CONCURRENTLY`** in its own file with Prisma's tx
  wrapper disabled (see `docs/DB_ROLES.md`), run under `bonza_migrate`.
- **Storage low:** `maxAllocatedStorage` autoscales to 2× — confirm it's growing; else raise it.

## Recovery / data loss
- **Need to restore?** PITR to any second in the backup window (prod retention). Restore to a **new** instance,
  validate, then cut over — never restore in place under load.
- After any incident, confirm the append-only ledgers are intact (`BonzaCredit`, `AuditEvent` — they can't be
  mutated by `bonza_app`, so corruption can only be additive).
