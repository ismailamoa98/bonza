// config/env.js — loads .env and exposes typed config + has* integration gates (offline-safe).
require("dotenv").config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const GONDOLA_MCP_URL = (process.env.GONDOLA_MCP_URL || "https://mcp.gondola.ai/mcp").trim();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  ANTHROPIC_API_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || "",

  hasRealAnthropicKey: /^sk-/.test(ANTHROPIC_API_KEY),

  hasEmailSync: process.env.EMAIL_SYNC === "true",

  hasDuffel: /^duffel_(test|live)_/.test(process.env.DUFFEL_API_KEY || ""),

  hasSeatsAero: Boolean((process.env.SEATS_AERO_API_KEY || "").trim()),

  GOOGLE_PLACES_API_KEY: (process.env.GOOGLE_PLACES_API_KEY || "").trim(),
  hasGooglePlaces: Boolean((process.env.GOOGLE_PLACES_API_KEY || "").trim()),
  hasUnsplash: Boolean((process.env.UNSPLASH_ACCESS_KEY || "").trim()),

  GONDOLA_MCP_URL,
  hasGondola: Boolean(GONDOLA_MCP_URL),

  proEnforced: process.env.PRO_ENFORCED === "true",

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_PRO_ANNUAL_PRICE_ID: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "",
  hasStripe: /^sk_(test|live)_/.test(process.env.STRIPE_SECRET_KEY || ""),

  CARTRAWLER_API_KEY: (process.env.CARTRAWLER_API_KEY || "").trim(),
  hasCartrawler: Boolean((process.env.CARTRAWLER_API_KEY || "").trim()),

  GMAIL_CLIENT_ID: (process.env.GMAIL_CLIENT_ID || "").trim(),
  GMAIL_CLIENT_SECRET: (process.env.GMAIL_CLIENT_SECRET || "").trim(),
  hasGmailOAuth: Boolean(
    (process.env.GMAIL_CLIENT_ID || "").trim() && (process.env.GMAIL_CLIENT_SECRET || "").trim()
  ),

  MICROSOFT_CLIENT_ID: (process.env.MICROSOFT_CLIENT_ID || "").trim(),
  MICROSOFT_CLIENT_SECRET: (process.env.MICROSOFT_CLIENT_SECRET || "").trim(),
  hasOutlookOAuth: Boolean(
    (process.env.MICROSOFT_CLIENT_ID || "").trim() && (process.env.MICROSOFT_CLIENT_SECRET || "").trim()
  ),

  OAUTH_REDIRECT_BASE: (process.env.OAUTH_REDIRECT_BASE || "http://localhost:5000").trim(),

  RESEND_API_KEY: (process.env.RESEND_API_KEY || "").trim(),
  hasEmailSend: /^re_/.test(process.env.RESEND_API_KEY || ""),
  EMAIL_FROM: process.env.EMAIL_FROM || "Bonza <notifications@bonza.app>",

  TRAVELPAYOUTS_TOKEN: (process.env.TRAVELPAYOUTS_TOKEN || "").trim(),
  AWIN_AFFILIATE_ID: (process.env.AWIN_AFFILIATE_ID || "").trim(),
  IMPACT_HYATT_CAMPAIGN_ID: (process.env.IMPACT_HYATT_CAMPAIGN_ID || "").trim(),
  hasAffiliate: Boolean(
    (process.env.TRAVELPAYOUTS_TOKEN || "").trim() ||
      (process.env.AWIN_AFFILIATE_ID || "").trim() ||
      (process.env.IMPACT_HYATT_CAMPAIGN_ID || "").trim()
  ),

  SENTRY_DSN: (process.env.SENTRY_DSN || "").trim(),
  hasSentry: Boolean((process.env.SENTRY_DSN || "").trim()),

  // Phase 25 §25d — salt for one-way IP hashing on legal-acceptance records (never store the raw IP).
  APP_SALT: process.env.APP_SALT || "bonza-dev-salt-change-me",

  // Phase 25 §25e — DSAR export delivery. With a bucket + AWS creds the export zip is uploaded and a 72h
  // signed link is emailed; offline it's written to a temp path and logged (no link).
  AWS_REGION: (process.env.AWS_REGION || "eu-west-2").trim(),
  S3_EXPORT_BUCKET: (process.env.S3_EXPORT_BUCKET || "").trim(),
  hasS3Export: Boolean((process.env.S3_EXPORT_BUCKET || "").trim()),

  // Phase 25 §25i — the bundled flight+hotel single-total cash checkout. Defaults ON for the build; must be
  // flipped OFF at go-live (BUNDLED_CHECKOUT_ENABLED=false) until the ATOL question (§25h) is answered. The
  // flight and hotel cash paths stay separable in code regardless, so an agent-model restructure is a flow
  // change, not a rewrite.
  bundledCheckoutEnabled: process.env.BUNDLED_CHECKOUT_ENABLED !== "false",

  // Phase 27 §27d — Cloudflare Turnstile (bot challenge) on the public support-contact form + the signup
  // pre-gate. Offline (no secret) the server verify is a no-op accept so dev/tests stay frictionless.
  TURNSTILE_SECRET_KEY: (process.env.TURNSTILE_SECRET_KEY || "").trim(),
  hasTurnstile: Boolean((process.env.TURNSTILE_SECRET_KEY || "").trim()),

  // Phase 27 §27d — per-service daily external-call budgets (global, UTC). The interactive share is capped
  // below these so a scraper can't starve the reserved nightly-job slice. Only the REAL outbound branches
  // consume budget, so these are inert offline. Override via SPEND_BUDGET_<SERVICE> env vars.
  SPEND_BUDGETS: {
    seats_aero: Number(process.env.SPEND_BUDGET_SEATS_AERO) || 5000,
    duffel: Number(process.env.SPEND_BUDGET_DUFFEL) || 5000,
    claude: Number(process.env.SPEND_BUDGET_CLAUDE) || 10000,
  },
  // Fraction of each budget reserved for nightly jobs (interactive callers are denied above the rest).
  SPEND_RESERVE_FRACTION: Number(process.env.SPEND_RESERVE_FRACTION) || 0.15,
};

if (!env.DATABASE_URL) {
  console.warn(
    "[env] DATABASE_URL is not set — copy .env.example to .env before running the database."
  );
}

if (!process.env.CLERK_SECRET_KEY) {
  console.warn(
    "[env] CLERK_SECRET_KEY is not set — auth will not work. Add Clerk test keys to .env (see .env.example)."
  );
}

module.exports = env;
