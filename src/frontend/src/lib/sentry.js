// lib/sentry.js — Phase 24 §24d. Frontend Sentry init (gated on VITE_SENTRY_DSN). No-op without a DSN.
// Strips query strings (they carry origin/destination/dates), ignores known noise, no PII.
import * as Sentry from "@sentry/react";

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENV || import.meta.env.MODE, // dev | staging | production
    release: import.meta.env.VITE_RELEASE || import.meta.env.VITE_GIT_COMMIT_SHA,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: (import.meta.env.VITE_ENV || import.meta.env.MODE) === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 0.2,
    sendDefaultPii: false,
    beforeSend(event) {
      // strip query strings — they carry origin/destination/dates
      if (event.request?.url) event.request.url = event.request.url.split("?")[0];
      return event;
    },
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      /^Load failed$/, // Safari offline fetch
      "AbortError",
    ],
  });
}
