// lambda/handler.js — Lambda entry dispatching nightly_personalisation / monthly_summary jobs.
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

exports.handler = async (event) => {
  const { jobType } = event || {};

  console.log(JSON.stringify({ level: "info", message: "Lambda job starting", jobType }));

  switch (jobType) {
    case "nightly_personalisation":
      await runNightlyJobs();
      break;
    case "monthly_summary":
      await runMonthlySummaries();
      break;
    case "valuation_refresh":
      await refreshValuations();
      break;
    case "fx_refresh": // Phase 27 §27b — daily GBP-base FX snapshot persisted to FxRate
      await refreshFxRates();
      break;
    case "parse_stats": // Phase 27 §27c — nightly per-programme statement-parse success-rate + alarm
      await runParseStats();
      break;
    case "hero_destinations":
      await refreshHeroDestinations();
      break;
    case "explore_refresh":
      await refreshExplore({ continent: event.continent });
      break;
    case "retention": // Phase 25 §25f — nightly retention sweep (includes due hard-deletes)
      await runRetention();
      break;
    case "hard_delete": // Phase 25 §25e — process soft-deletes past the 14-day grace
      await runHardDeleteJob();
      break;
    case "data_export": // Phase 25 §25e — async DSAR export for one user
      await runExportJob({ userId: event.userId });
      break;
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }

  console.log(JSON.stringify({ level: "info", message: "Lambda job complete", jobType }));
  return { statusCode: 200, jobType };
};
