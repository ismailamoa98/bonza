// lambda/handler.js — Lambda entry dispatching nightly_personalisation / monthly_summary jobs.
const { runNightlyJobs } = require("../jobs/personalisationJob");
const { runMonthlySummaries } = require("../jobs/monthlySummaryJob");

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
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }

  console.log(JSON.stringify({ level: "info", message: "Lambda job complete", jobType }));
  return { statusCode: 200, jobType };
};
