// middleware/auth.js — Clerk authentication.
// Reads the Clerk session (clerkMiddleware() must run first in server.js) and
// attaches req.userId. The shape is preserved from the old JWT middleware
// (req.userId, default export `auth`) so no endpoint needs changing.
// In development, requests without a Clerk session fall back to the seeded demo
// user so the 3-step flow works out of the box; production returns 401.
const { getAuth } = require("@clerk/express");
const env = require("../config/env");
const { DEV_USER } = require("../config/constants");
const { ensureUser } = require("../utils/ensureUser");

module.exports = async function auth(req, res, next) {
  try {
    const { userId } = getAuth(req);

    if (userId) {
      req.userId = userId;
      // Clerk doesn't write to our DB — make sure a profile row exists so the
      // foreign keys on Trip/BookingLink/etc. resolve (covers local dev without
      // the webhook tunnel; the webhook keeps prod in sync).
      await ensureUser(userId);
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
