// services/jobStats.js — Phase 27 §27f. Read-only views over JobRun / JobLease for /admin/jobs and the
// liveness check. No mutation; the runner owns all writes.
const prisma = require("../config/database");

// The most recent executions across all jobs (default 50), newest first.
async function recentRuns({ limit = 50 } = {}) {
  return prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: limit });
}

// Per-job health: last run, last success, and whether the last attempt failed — the shape the liveness/
// staleness alarm reads. `staleAfterMs` lets a caller flag a job with no success inside its window.
async function jobHealth({ staleAfterMs = null } = {}) {
  const runs = await prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 500 });
  const byJob = {};
  for (const r of runs) {
    const j = (byJob[r.name] ||= { name: r.name, lastRun: null, lastSuccess: null, lastOutcome: null, runs: 0 });
    j.runs += 1;
    if (!j.lastRun) {
      j.lastRun = r.startedAt;
      j.lastOutcome = r.outcome;
    }
    if (!j.lastSuccess && r.outcome === "success") j.lastSuccess = r.finishedAt || r.startedAt;
  }
  const now = Date.now();
  return Object.values(byJob).map((j) => ({
    ...j,
    stale: staleAfterMs != null && (!j.lastSuccess || now - new Date(j.lastSuccess).getTime() > staleAfterMs),
  }));
}

// Currently-held leases (expiry in the future).
async function activeLeases() {
  return prisma.jobLease.findMany({ where: { expiresAt: { gt: new Date() } }, orderBy: { name: "asc" } });
}

module.exports = { recentRuns, jobHealth, activeLeases };
