// middleware/auth.js — Clerk auth -> req.userId (dev falls back to seeded user); JIT ensureUser + login stamp.
const { getAuth } = require("@clerk/express");
const env = require("../config/env");
const prisma = require("../config/database");
const { DEV_USER } = require("../config/constants");
const { ensureUser } = require("../utils/ensureUser");
const { sendError } = require("../utils/AppError");
const requestContext = require("../utils/requestContext"); // §27i — stamp userId onto the correlation context

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
      requestContext.set("userId", userId);
      const user = await ensureUser(userId, req);
      stampLastLogin(userId);
      if (isLockedOut(user, req)) return sendError(res, "ACCOUNT_LOCKED");
      return next();
    }

    if (env.NODE_ENV !== "production") {
      req.userId = DEV_USER.id;
      requestContext.set("userId", DEV_USER.id);
      // The dev-fallback user can also be mid-deletion; honour the same lock.
      const devUser = await prisma.user.findUnique({ where: { id: DEV_USER.id } }).catch(() => null);
      if (isLockedOut(devUser, req)) return sendError(res, "ACCOUNT_LOCKED");
      return next();
    }

    return sendError(res, "UNAUTHENTICATED", { message: "Unauthorised" });
  } catch (err) {
    next(err);
  }
};

// Phase 25 §25e — a soft-deleted account is locked: block mutations, but keep reads and the undo path
// (/me/delete/cancel) reachable so the user can still see the countdown and restore the account.
function isLockedOut(user, req) {
  if (!user?.deletedAt) return false;
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const isUndo = req.method === "POST" && req.originalUrl.includes("/me/delete/cancel");
  return isMutation && !isUndo;
}
