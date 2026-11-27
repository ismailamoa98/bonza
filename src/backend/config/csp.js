// config/csp.js — Phase 27 §27j. The single source of truth for the Content-Security-Policy. Used by helmet on
// the API tier (server.js); the SAME directives are mirrored in infra/lib/constructs/frontend.ts for the
// CloudFront-served SPA (keep the two in sync — the TS infra can't import this CJS module at synth time).
//
// No inline bootstrap script exists in the built SPA (Vite emits an external hashed module script), so
// script-src needs neither a nonce nor 'unsafe-inline'. style-src keeps 'unsafe-inline' because React / Tailwind
// / MapLibre set inline style attributes (styles, not scripts — far lower risk). The policy is ENFORCED by
// default (go-live cutover); CSP_REPORT_ONLY=true drops back to report-only (violations reported to
// report-uri → Sentry or the local /security/csp-report sink) if a directive needs widening.
const env = require("./env");

// Third-party origins the app genuinely talks to (discovered from the frontend): Clerk (auth), Stripe
// (payments), Cloudflare Turnstile (bot gate), PostHog (analytics), CARTO (maplibre basemap), Google Fonts,
// Sentry (error + CSP ingest), and image CDNs (flags, landmark photos).
const CLERK = ["https://*.clerk.accounts.dev", "https://*.clerk.com", "https://clerk.bonza.app"];
const STRIPE = ["https://js.stripe.com", "https://api.stripe.com", "https://hooks.stripe.com"];
const TURNSTILE = ["https://challenges.cloudflare.com"];
const POSTHOG = ["https://eu.i.posthog.com", "https://eu-assets.i.posthog.com"];
const CARTO = ["https://*.basemaps.cartocdn.com", "https://basemaps.cartocdn.com"];
const SENTRY = ["https://*.ingest.sentry.io", "https://*.ingest.de.sentry.io"];
const FONTS_CSS = ["https://fonts.googleapis.com"];
const FONTS_FILES = ["https://fonts.gstatic.com"];

const directives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'self'"], // clickjacking — don't let the app be framed by third parties
  formAction: ["'self'", ...CLERK],
  // External hashed module script + the third-party SDKs; NO 'unsafe-inline' and no nonce needed.
  scriptSrc: ["'self'", ...CLERK, ...STRIPE, ...TURNSTILE, ...POSTHOG],
  // XHR/fetch/websocket targets.
  connectSrc: ["'self'", ...CLERK, ...STRIPE, ...POSTHOG, ...CARTO, ...SENTRY, "https://api.unsplash.com"],
  // Stripe Elements, Clerk, and the Turnstile widget render in iframes.
  frameSrc: ["'self'", ...STRIPE, ...CLERK, ...TURNSTILE],
  // MapLibre GL runs its renderer in a blob: web worker.
  workerSrc: ["'self'", "blob:"],
  // Inline styles from React/Tailwind/MapLibre + Google Fonts stylesheet.
  styleSrc: ["'self'", "'unsafe-inline'", ...FONTS_CSS],
  fontSrc: ["'self'", "data:", ...FONTS_FILES],
  // Many image CDNs (flags, Wikimedia/Openverse/Unsplash landmark photos, CARTO tiles, Clerk/Stripe avatars) —
  // allow any https image plus data:/blob:, rather than an unmaintainable host allowlist.
  imgSrc: ["'self'", "data:", "blob:", "https:"],
  manifestSrc: ["'self'"],
  upgradeInsecureRequests: [],
};

// Where the browser POSTs violation reports. Prefer an explicit Sentry CSP endpoint; else the local sink.
const reportUri = env.CSP_REPORT_URI || "/api/v1/security/csp-report";

// Enforced by default; CSP_REPORT_ONLY=true reverts to report-only (watch violations without blocking).
const reportOnly = env.CSP_REPORT_ONLY;

module.exports = { directives, reportUri, reportOnly };
