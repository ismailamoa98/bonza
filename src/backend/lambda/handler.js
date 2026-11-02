// lambda/handler.js — Lambda entry. Every scheduled jobType runs through the §27f jobRunner, which leases
// the job (single-runner), records a JobRun, and releases in a finally. The JOBS table maps a jobType to its
// body, its lease TTL (~2× expected runtime so a crashed holder self-expires), and — for per-entity jobs — a
// lease key that includes the entity id so concurrent exports/continents don't block each other.
const { runNightlyJobs } = require("../jobs/personalisationJob");
const { runMonthlySummaries } = require("../jobs/monthlySummaryJob");
const { refreshValuations } = require("../jobs/valuationRefreshJob");
const { refreshHeroDestinations } = require("../jobs/heroDestinationJob");
const { refreshExplore } = require("../jobs/exploreRefreshJob");
const { runRetention } = require("../jobs/retentionJob");
const { runHardDeleteJob } = require("../jobs/hardDeleteJob");
const { runExportJob } = require("../jobs/exportJob");
const { refreshFxRates } = require("../jobs/fxRefreshJob");
const { runParseStats } = require("../jobs/parseStatsJob");
const { runJob } = require("../utils/jobRunner");

const MIN = 60 * 1000;

// run(event, ctx) — ctx carries best-effort counters + renew(); leaseKey(event) defaults to the jobType.
const JOBS = {
  nightly_personalisation: { run: () => runNightlyJobs(), ttlMs: 20 * MIN },
  monthly_summary: { run: () => runMonthlySummaries(), ttlMs: 20 * MIN },
  valuation_refresh: { run: () => refreshValuations(), ttlMs: 10 * MIN },
  fx_refresh: { run: () => refreshFxRates(), ttlMs: 5 * MIN }, // §27b
  parse_stats: { run: () => runParseStats(), ttlMs: 5 * MIN }, // §27c
  hero_destinations: { run: () => refreshHeroDestinations(), ttlMs: 15 * MIN },
  explore_refresh: {
    run: (e) => refreshExplore({ continent: e.continent }),
    ttlMs: 30 * MIN,
    leaseKey: (e) => `explore_refresh:${e.continent || "all"}`,
  },
  retention: { run: () => runRetention(), ttlMs: 20 * MIN }, // §25f
  hard_delete: { run: () => runHardDeleteJob(), ttlMs: 20 * MIN }, // §25e
  data_export: {
    run: (e) => runExportJob({ userId: e.userId }),
    ttlMs: 15 * MIN,
    leaseKey: (e) => `data_export:${e.userId}`, // per-user: one user's export never blocks another's
  },
};

exports.handler = async (event) => {
  const { jobType } = event || {};
  const spec = JOBS[jobType];
  if (!spec) throw new Error(`Unknown job type: ${jobType}`);

  const leaseName = spec.leaseKey ? spec.leaseKey(event) : jobType;
  // The AWS request id (when present) is a natural correlation id for this invocation (§27i).
  const requestId = event.requestId || null;

  const { skipped } = await runJob(
    { name: jobType, leaseName, ttlMs: spec.ttlMs, requestId },
    (ctx) => spec.run(event, ctx)
  );

  return { statusCode: 200, jobType, skipped: !!skipped };
};
