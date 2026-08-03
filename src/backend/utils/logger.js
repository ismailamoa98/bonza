// utils/logger.js — structured JSON logs to stdout + Sentry capture on error.
const Sentry = require("@sentry/node");

const logger = {
  info: (message, meta = {}) => {
    console.log(
      JSON.stringify({ level: "info", message, timestamp: new Date().toISOString(), ...meta })
    );
  },

  warn: (message, meta = {}) => {
    console.warn(
      JSON.stringify({ level: "warn", message, timestamp: new Date().toISOString(), ...meta })
    );
    Sentry.addBreadcrumb({ message, level: "warning", data: meta });
  },

  error: (message, error, meta = {}) => {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        error: error?.message,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        ...meta,
      })
    );
    Sentry.captureException(error, { extra: { message, ...meta } });
  },

  setUser: (userId) => {
    Sentry.setUser({ id: userId });
  },
};

module.exports = { logger };
