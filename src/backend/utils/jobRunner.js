// utils/jobRunner.js — Phase 27 §27f. The orchestration wrapper every scheduled job runs through. It gives
// each job three guarantees:
//   1. Single-runner — a Postgres JobLease (acquired by a conditional upsert that only wins when no live
//      lease exists) means two deliveries of the same schedule, or a manual re-trigger racing the cron,
//      never run the body twice. A worker that can't get the lease exits cleanly (records a 'lease_held' run).
//   2. A JobRun record — started/finished/outcome plus best-effort item/external-call/error counts, for the
//      /admin/jobs view and the liveness alarms.
//   3. Lease safety — the TTL is ~2× the expected runtime so a crashed holder's lease self-expires; the body
//      can renew() mid-run, and the lease is always released in a finally.
const crypto = require("crypto");
const prisma = require("../config/database");
const { logger } = require("../utils/logger");
const requestContext = require("./requestContext"); // §27i — one correlation id per job run

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 min — overridden per job to ~2× its expected runtime
const MAX_ERR_LEN = 500;

function newHolder() {
  return `${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
}

// Acquire the lease iff it's free or expired. One atomic statement — INSERT, or UPDATE only when the
// existing row is past its expiry — so concurrent workers can't both win. Returns true when acquired.
async function acquireLease(name, holder, ttlMs) {
  const expiresAt = new Date(Date.now() + ttlMs);
  const rows = await prisma.$queryRaw`
    INSERT INTO "JobLease" (name, holder, "acquiredAt", "expiresAt")
    VALUES (${name}, ${holder}, now(), ${expiresAt})
    ON CONFLICT (name) DO UPDATE
      SET holder = ${holder}, "acquiredAt" = now(), "expiresAt" = ${expiresAt}
      WHERE "JobLease"."expiresAt" < now()
    RETURNING name`;
  return rows.length > 0;
}

// Extend the lease (only while we still hold it). Jobs call this between long steps.
async function renewLease(name, holder, ttlMs) {
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.$executeRaw`
    UPDATE "JobLease" SET "expiresAt" = ${expiresAt}
    WHERE name = ${name} AND holder = ${holder}`;
}

// Release the lease — but only if we're still the holder (a lease we lost to expiry + another worker must
// not be deleted out from under them).
async function releaseLease(name, holder) {
  await prisma.$executeRaw`DELETE FROM "JobLease" WHERE name = ${name} AND holder = ${holder}`;
}

// Run `fn` under the lease `leaseName`, recording a JobRun named `name` (the jobType). `fn` receives a ctx:
//   { items, externalCalls, errors, renew() } — mutate the counters to report progress; call renew() during
// long work. Returns { skipped, result }. On a job error the JobRun is marked 'error' and the error re-thrown.
async function runJob({ name, leaseName = name, ttlMs = DEFAULT_TTL_MS, holder = newHolder(), requestId = crypto.randomUUID() }, fn) {
  // §27i — the whole run executes inside the correlation context, so every log line (and outbound call) the job
  // body emits carries this request_id, which is also persisted on the JobRun for end-to-end tracing.
  return requestContext.run({ requestId }, async () => {
    const acquired = await acquireLease(leaseName, holder, ttlMs);
    if (!acquired) {
      logger.warn?.(`[jobRunner] ${name} lease '${leaseName}' held by another worker — exiting cleanly`);
      await prisma.jobRun.create({ data: { name, holder, outcome: "lease_held", finishedAt: new Date(), requestId } });
      return { skipped: true };
    }

    const run = await prisma.jobRun.create({ data: { name, holder, outcome: "running", requestId } });
    const ctx = {
      items: 0,
      externalCalls: 0,
      errors: 0,
      renew: () => renewLease(leaseName, holder, ttlMs),
    };

    try {
      const result = await fn(ctx);
      await prisma.jobRun.update({
        where: { id: run.id },
        data: { outcome: "success", finishedAt: new Date(), items: ctx.items, externalCalls: ctx.externalCalls, errors: ctx.errors },
      });
      logger.info?.(`[jobRunner] ${name} ok`, { items: ctx.items, externalCalls: ctx.externalCalls, errors: ctx.errors });
      // §27i — a metric line per outcome so a nightly-job failure/absence is alarmable (MetricFilter in monitoring.ts).
      logger.info?.("[metric] BonzaJobOutcome", { metric: "BonzaJobOutcome", job: name, value: 1 });
      return { skipped: false, result };
    } catch (err) {
      await prisma.jobRun.update({
        where: { id: run.id },
        data: { outcome: "error", finishedAt: new Date(), items: ctx.items, externalCalls: ctx.externalCalls, errors: ctx.errors + 1, error: String(err && err.message).slice(0, MAX_ERR_LEN) },
      });
      logger.error?.(`[jobRunner] ${name} failed`, { error: err && err.message });
      logger.info?.("[metric] BonzaJobOutcome", { metric: "BonzaJobOutcome", job: name, value: 0 });
      throw err;
    } finally {
      await releaseLease(leaseName, holder).catch((e) => logger.warn?.(`[jobRunner] release failed for ${leaseName}`, { error: e.message }));
    }
  });
}

module.exports = { runJob, acquireLease, renewLease, releaseLease, newHolder, DEFAULT_TTL_MS };
