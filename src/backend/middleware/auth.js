// middleware/auth.js — JWT authentication.
// Verifies a bearer token and attaches req.userId. For the development MVP
// (no signup endpoint yet), requests without a valid token fall back to the
// seeded demo user so the 3-step flow works out of the box.
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { DEV_USER } = require("../config/constants");

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      req.userId = payload.userId || payload.sub;
      return next();
    } catch (err) {
      // Invalid/expired token — fall through to the dev user in development.
      if (env.NODE_ENV === "production") {
        return res.status(401).json({ error: { message: "Invalid or expired token" } });
      }
    }
  }

  if (env.NODE_ENV === "production") {
    return res.status(401).json({ error: { message: "Authentication required" } });
  }

  req.userId = DEV_USER.id;
  next();
};
