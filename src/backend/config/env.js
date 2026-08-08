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
