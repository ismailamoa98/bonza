// jobs/hardDeleteJob.js — Phase 25 §25e. Runs the hard-delete cascade for every account whose 14-day
// soft-delete window has elapsed. Scheduled via the Lambda `hard_delete` jobType (nightly). Logs the counts so
// the audit log can show the policy actually executes.
const { runHardDeletes } = require("../services/accountDeletion");
const { logger } = require("../utils/logger");

async function runHardDeleteJob() {
  const result = await runHardDeletes();
  logger.info(`[hardDeleteJob] processed ${result.due} due, hard-deleted ${result.deleted}`);
  return result;
}

module.exports = { runHardDeleteJob };
