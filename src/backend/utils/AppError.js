// utils/AppError.js — Phase 24 §24h. The one typed error the API throws. errorHandler turns it into the
// fixed response shape { error: { code, message, retryable, service } }. Throw `new AppError("CODE")` and
// the defaults below fill in status/message/retryable; override any field via the second arg.
//
//   throw new AppError("AWARD_SEARCH_UNAVAILABLE", { service: "seats_aero" });
//   throw new AppError("VALIDATION_FAILED", { message: "dates are required" });

const CODES = {
  VALIDATION_FAILED: { status: 400, retryable: false, message: "Some details are missing or invalid." },
  UNAUTHENTICATED: { status: 401, retryable: false, message: "Please sign in to continue." },
  PLAN_REQUIRED: { status: 402, retryable: false, message: "This feature needs Bonza Pro." },
  FORBIDDEN: { status: 403, retryable: false, message: "You don’t have access to that." },
  NOT_FOUND: { status: 404, retryable: false, message: "We couldn’t find that." },
  RATE_LIMITED: { status: 429, retryable: true, message: "You’re going a little fast — try again in a moment." },
  AWARD_SEARCH_UNAVAILABLE: { status: 503, retryable: true, service: "seats_aero", message: "Award space couldn’t be checked for this route." },
  FLIGHT_SEARCH_UNAVAILABLE: { status: 503, retryable: true, service: "duffel", message: "We couldn’t search flights just now." },
  HOTEL_SEARCH_UNAVAILABLE: { status: 503, retryable: true, service: "duffel", message: "We couldn’t search hotels just now." },
  OFFER_EXPIRED: { status: 409, retryable: true, service: "duffel", message: "Prices moved while you were looking." },
  PAYMENT_FAILED: { status: 402, retryable: false, service: "stripe", message: "Your payment couldn’t be completed. Nothing was charged." },
  BOOKING_FAILED: { status: 502, retryable: false, service: "duffel", message: "The booking didn’t go through. Nothing was charged." },
  SYNC_FAILED: { status: 502, retryable: true, service: "internal", message: "We couldn’t sync your balances just now." },
  ASSISTANT_UNAVAILABLE: { status: 503, retryable: true, service: "claude", message: "The assistant is unavailable right now." },
  INTERNAL: { status: 500, retryable: false, service: "internal", message: "Something went wrong on our end. Please try again." },
};

class AppError extends Error {
  constructor(code, overrides = {}) {
    const def = CODES[code] || CODES.INTERNAL;
    super(overrides.message || def.message);
    this.name = "AppError";
    this.code = CODES[code] ? code : "INTERNAL";
    this.status = overrides.status ?? def.status;
    this.retryable = overrides.retryable ?? def.retryable ?? false;
    this.service = overrides.service ?? def.service ?? null;
    if (overrides.cause) this.cause = overrides.cause;
  }
}

// The single serialized error body (§24h). Used by both errorHandler and sendError.
function serialize(appErr) {
  return {
    error: {
      code: appErr.code,
      message: appErr.message || CODES.INTERNAL.message,
      retryable: appErr.retryable,
      service: appErr.service,
    },
  };
}

// Inline helper for route guards that return rather than throw (avoids async-throw plumbing):
//   if (!email) return sendError(res, "VALIDATION_FAILED", { message: "Email is required" });
function sendError(res, code, overrides = {}) {
  const e = new AppError(code, overrides);
  return res.status(e.status).json(serialize(e));
}

module.exports = { AppError, CODES, serialize, sendError };
