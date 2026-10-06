// middleware/requireAdmin.js — Phase 22. Gates /admin on a Clerk 'admin' role claim (not an email allowlist).
// Reads the role from the session claims (sessionClaims.metadata.role === 'admin'), or Clerk's has({ role }).
// Dev fallback: in non-production with ADMIN_DEV=true (or no Clerk session → seeded dev user), access is
// allowed so the inspector is testable offline. Production REQUIRES the real claim. Sets req.userId.
const { getAuth } = require("@clerk/express");
const env = require("../config/env");
const { DEV_USER } = require("../config/constants");

module.exports = function requireAdmin(req, res, next) {
  try {
    const auth = getAuth(req);
    const { userId, sessionClaims, has } = auth || {};

    const isAdmin =
      (typeof has === "function" && (has({ role: "admin" }) || has({ role: "org:admin" }))) ||
      sessionClaims?.metadata?.role === "admin" ||
      sessionClaims?.publicMetadata?.role === "admin";

    if (userId && isAdmin) {
      req.userId = userId;
      return next();
    }

    // Offline/dev convenience so the inspector can be exercised without a configured Clerk role.
    if (env.NODE_ENV !== "production" && (process.env.ADMIN_DEV === "true" || !userId)) {
      req.userId = userId || DEV_USER.id;
      req.isDevAdmin = true;
      return next();
    }

    return res.status(403).json({ error: { message: "Admin access required" } });
  } catch (err) {
    next(err);
  }
};
