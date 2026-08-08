// middleware/errorHandler.js — 404 + central error handler; logs 5xx via logger (Sentry).
const { logger } = require("../utils/logger");

function notFound(req, res, _next) {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message =
    status >= 500
      ? "Something went wrong on our end. Please try again."
      : err.message || "Request could not be processed.";

  if (status >= 500) {
    logger.error("Unhandled request error", err, {
      path: req.path,
      method: req.method,
      status,
      userId: req.userId,
    });
  }

  res.status(status).json({ error: { message } });
}

module.exports = { notFound, errorHandler };
