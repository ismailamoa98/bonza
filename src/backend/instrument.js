// instrument.js — Sentry init; must load before app modules. No-op without a DSN.
const env = require("./config/env"); // loads dotenv, exposes SENTRY_DSN + hasSentry

if (env.hasSentry) {
  const Sentry = require("@sentry/node");
  const { nodeProfilingIntegration } = require("@sentry/profiling-node");

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: process.env.GIT_COMMIT_SHA || "unknown",

    integrations: [
      nodeProfilingIntegration(),
      Sentry.prismaIntegration(), // tracks slow Prisma queries
      Sentry.expressIntegration(),
    ],

    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: 0.1,

    beforeSend(event) {
      const value = event.exception?.values?.[0]?.value || "";
      if (value.includes("Unauthorised") || value.includes("Not found")) return null;
      return event;
    },
  });
}
