// config/env.js — Environment variable loading and validation.
// Loads .env via dotenv and exposes typed, validated config values.
require("dotenv").config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  ANTHROPIC_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET || "dev-insecure-secret",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  BACKEND_URL: process.env.BACKEND_URL || "http://localhost:5000",

  // True only when a real Anthropic key is configured. The dev .env ships a
  // placeholder ("random-api-key"), so this stays false and the optimizer/chat
  // use mock data — keeping `npm run dev` fully functional offline.
  hasRealAnthropicKey: /^sk-/.test(ANTHROPIC_API_KEY),
};

if (!env.DATABASE_URL) {
  console.warn(
    "[env] DATABASE_URL is not set — copy .env.example to .env before running the database."
  );
}

module.exports = env;
