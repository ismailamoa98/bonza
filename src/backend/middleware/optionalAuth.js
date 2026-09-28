// middleware/optionalAuth.js — resolves a Clerk session if one is present, never rejects. For public
// routes that render differently when signed in (e.g. the hero board's affordability markers).
// In non-production, falls back to the seeded demo user so the logged-in view is demoable offline; in
// production an anonymous caller gets req.userId = null (the logged-out view).
const { getAuth } = require("@clerk/express");
const env = require("../config/env");
const { DEV_USER } = require("../config/constants");

function optionalAuth(req, res, next) {
  try {
    const { userId } = getAuth(req);
    if (userId) req.userId = userId;
    else req.userId = env.NODE_ENV !== "production" ? DEV_USER.id : null;
  } catch {
    req.userId = null;
  }
  next();
}

module.exports = { optionalAuth };
