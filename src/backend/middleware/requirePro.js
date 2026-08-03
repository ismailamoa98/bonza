// middleware/requirePro.js — 403 PRO_REQUIRED unless active subscription (off in dev unless PRO_ENFORCED).
const prisma = require("../config/database");
const env = require("../config/env");

const ACTIVE_STATUSES = ["active", "trialing"];

function isProActive(sub) {
  if (!sub) return false;
  const notExpired = !sub.currentPeriodEnd || sub.currentPeriodEnd > new Date();
  if (ACTIVE_STATUSES.includes(sub.status)) return notExpired;
  if (sub.status === "cancelled") return Boolean(sub.currentPeriodEnd) && sub.currentPeriodEnd > new Date();
  return false;
}

async function requirePro(req, res, next) {
  try {
    if (!env.proEnforced) return next();

    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId } });
    if (isProActive(sub)) return next();

    return res.status(403).json({
      error: "Bonza Pro required",
      code: "PRO_REQUIRED",
      upgradeUrl: "/dashboard?upgrade=true",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = requirePro;
module.exports.isProActive = isProActive;
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
