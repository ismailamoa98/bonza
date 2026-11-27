// jobs/parseStatsJob.js — Phase 27 §27c. Nightly aggregate of statement-parse outcomes per programme. Emits
// one structured metric line per programme (picked up as a CloudWatch metric filter in the §27i monitoring
// construct) and flags any programme whose success rate fell below 80% over the trailing 24h with at least 5
// attempts — the condition the alarm fires on. Pure read + log; never mutates. Scheduled via the Lambda
// `parse_stats` jobType. Offline it simply logs (no attempts → nothing to report).
const { successRateByProgramme } = require("../services/statementStats");
const { logger } = require("../utils/logger");

const ALARM_THRESHOLD = 0.8; // < 80% success over the window fires the alarm
const MIN_ATTEMPTS = 5; // ignore programmes with too few attempts to be meaningful

async function runParseStats({ sinceHours = 24 } = {}) {
  const rows = await successRateByProgramme({ sinceHours });
  const alarming = [];

  for (const p of rows) {
    // One line per programme so a CloudWatch metric filter can graph ParseSuccessRate by programme.
    logger.info?.("[parseStats] programme parse rate", {
      metric: "ParseSuccessRate",
      programme: p.programme,
      successRate: Number(p.successRate.toFixed(4)),
      total: p.total,
      quarantined: p.quarantined,
      rejected: p.rejected,
      errors: p.errors,
      window: `${sinceHours}h`,
    });
    if (p.total >= MIN_ATTEMPTS && p.successRate < ALARM_THRESHOLD) alarming.push(p.programme);
  }

  if (alarming.length) {
    // The alarm condition. The metric filter / alarm lives in infra; this ERROR line is the signal offline.
    logger.error?.("[parseStats] ALARM: parse success below threshold", {
      threshold: ALARM_THRESHOLD,
      programmes: alarming,
      window: `${sinceHours}h`,
    });
  }

  return { programmes: rows.length, alarming };
}

module.exports = { runParseStats, ALARM_THRESHOLD, MIN_ATTEMPTS };
