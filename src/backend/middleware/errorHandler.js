// middleware/errorHandler.js — Phase 24 §24h. The ONLY place that writes an error body. Every error
// response is { error: { code, message, retryable, service } }. Known classes map to codes; anything
// unmapped becomes INTERNAL — never a stack trace, raw upstream body, or an upstream API key.
const { logger } = require("../utils/logger");
const { AppError, serialize } = require("../utils/AppError");

function notFound(req, _res, next) {
  next(new AppError("NOT_FOUND", { message: `Route not found: ${req.method} ${req.originalUrl}` }));
}

// Best-effort mapping of third-party / framework errors onto our codes.
function toAppError(err) {
  if (err instanceof AppError) return err;

  const status = err.status || err.statusCode || err.response?.status;

  // express-rate-limit / 429s
  if (status === 429) return new AppError("RATE_LIMITED");
  if (status === 401) return new AppError("UNAUTHENTICATED");
  if (status === 403) return new AppError("FORBIDDEN");
  if (status === 404) return new AppError("NOT_FOUND");
  if (status === 400 || err.name === "ZodError" || err.name === "ValidationError") {
    return new AppError("VALIDATION_FAILED", status ? { status } : {});
  }

  // Stripe SDK errors expose a `type` like 'StripeCardError'.
  if (typeof err.type === "string" && err.type.startsWith("Stripe")) {
    return new AppError("PAYMENT_FAILED", { cause: err });
  }
  // Duffel SDK errors carry an `errors` array / `meta.status`.
  if (err.errors && (err.meta || err.headers)) {
    return new AppError("BOOKING_FAILED", { cause: err });
  }
  // Prisma known-request errors (e.g. unique constraint) → validation.
  if (err.code && /^P\d{4}$/.test(err.code)) {
    return new AppError("VALIDATION_FAILED", { message: "That action couldn’t be completed.", cause: err });
  }

  return new AppError("INTERNAL", { cause: err });
}

function errorHandler(err, req, res, _next) {
  const appErr = toAppError(err);

  if (appErr.status >= 500) {
    logger.error("Unhandled request error", appErr.cause || err, {
      path: req.path,
      method: req.method,
      status: appErr.status,
      code: appErr.code,
      userId: req.userId,
      requestId: req.id,
    });
  }

  res.status(appErr.status).json(serialize(appErr));
}

module.exports = { notFound, errorHandler };
