// api/recommendations.js — serves personalised dashboard cards (mock-deck fallback).
const express = require("express");
const prisma = require("../config/database");
const { runJobForUser } = require("../jobs/personalisationJob");
const { logger } = require("../utils/logger");

const router = express.Router();

const RATING_RANK = { excellent: 0, good: 1, typical: 2, below_average: 3 };

const ON_DEMAND_WAIT_MS = 6000;

const fetchActive = (userId) =>
  prisma.personalisedRecommendation.findMany({
    where: { userId, isActive: true, expiresAt: { gt: new Date() } },
    orderBy: { generatedAt: "desc" },
    take: 12,
  });

const sortAndCap = (rows) => {
  rows.sort(
    (a, b) =>
      (RATING_RANK[a.pointsValueRating] ?? 9) - (RATING_RANK[b.pointsValueRating] ?? 9) ||
      b.generatedAt - a.generatedAt
  );
  return rows.slice(0, 8);
};

router.get("/", async (req, res, next) => {
  try {
    let rows = await fetchActive(req.userId);

    if (!rows.length) {
      let jobDone = false;
      const job = runJobForUser(req.userId, { force: true })
        .then(() => { jobDone = true; })
        .catch((err) => {
          jobDone = true; // a failed job is still "done" — don't keep the client polling
          logger.error("[recommendations] on-demand job failed", err);
        });
      const timeout = new Promise((resolve) => setTimeout(resolve, ON_DEMAND_WAIT_MS));
      await Promise.race([job, timeout]);

      rows = await fetchActive(req.userId);
      if (!rows.length) {
        return res.json({ recommendations: [], status: jobDone ? "ready" : "generating" });
      }
    }

    prisma.personalisedRecommendation
      .updateMany({ where: { userId: req.userId, isActive: true, viewedAt: null }, data: { viewedAt: new Date() } })
      .catch(() => {});

    res.json({ recommendations: sortAndCap(rows), status: "ready" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
