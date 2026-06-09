// middleware/errorHandler.js — Centralized error handling.
// Normalizes errors into friendly JSON responses and handles unknown routes.

function notFound(req, res, _next) {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message =
    status >= 500
      ? "Something went wrong on our end. Please try again."
      : err.message || "Request could not be processed.";

  if (status >= 500) {
    console.error("[error]", err);
  }

  res.status(status).json({ error: { message } });
}

module.exports = { notFound, errorHandler };
