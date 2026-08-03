// config/env.js — Environment variable loading and validation.
// Loads .env via dotenv and exposes typed, validated config values.
require("dotenv").config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  ANTHROPIC_API_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // Clerk owns auth. The SDK (@clerk/express) reads CLERK_SECRET_KEY +
  // CLERK_PUBLISHABLE_KEY from process.env directly; the webhook secret is read
  // here. There is no offline fallback — the server needs real (test) keys.
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || "",

  // True only when a real Anthropic key is configured. The dev .env ships a
  // placeholder ("random-api-key"), so this stays false and the optimizer/chat
  // use mock data — keeping the optimizer fully functional offline.
  hasRealAnthropicKey: /^sk-/.test(ANTHROPIC_API_KEY),

  // Off by default so dev uses the deterministic mock sync (no email OAuth locally).
  hasEmailSync: process.env.EMAIL_SYNC === "true",

  // Real Duffel token (duffel_test_/live_) routes inventory search to Duffel; else mock.
  hasDuffel: /^duffel_(test|live)_/.test(process.env.DUFFEL_API_KEY || ""),
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
