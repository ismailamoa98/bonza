// middleware/auth.js — Clerk auth -> req.userId (dev falls back to seeded user); JIT ensureUser + login stamp.
const { getAuth } = require("@clerk/express");
const env = require("../config/env");
const prisma = require("../config/database");
const { DEV_USER } = require("../config/constants");
const { ensureUser } = require("../utils/ensureUser");

const LOGIN_STAMP_THROTTLE_MS = 60 * 60 * 1000; // refresh lastLoginAt at most hourly

function stampLastLogin(userId) {
  const staleBefore = new Date(Date.now() - LOGIN_STAMP_THROTTLE_MS);
  prisma.user
    .updateMany({
      where: { id: userId, OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: staleBefore } }] },
      data: { lastLoginAt: new Date() },
    })
    .catch(() => {});
}

module.exports = async function auth(req, res, next) {
  try {
    const { userId } = getAuth(req);

    if (userId) {
      req.userId = userId;
      await ensureUser(userId);
      stampLastLogin(userId);
      return next();
    }

    if (env.NODE_ENV !== "production") {
      req.userId = DEV_USER.id;
      return next();
    }

    return res.status(401).json({ error: { message: "Unauthorised" } });
  } catch (err) {
    next(err);
  }
};
