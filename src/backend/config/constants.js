// config/constants.js — App-wide constants.

// Seeded demo user. Endpoints fall back to this user when no JWT is supplied,
// so the 3-step flow works out of the box in development (see middleware/auth.js).
const DEV_USER = {
  id: "user_dev_demo",
  email: "demo@bonza.app",
  name: "Demo Traveler",
  location: "New York, NY",
  travelStatus: "gold",
};

// The 5 optimization strategies Bonza always analyzes.
const STRATEGIES = ["transfer", "status", "cash", "hybrid", "direct"];

// Affiliate commission rates per booking type.
const COMMISSION_RATES = { flight: 0.03, hotel: 0.12, car: 0.1 };

// Booking links expire after this many days.
const BOOKING_LINK_TTL_DAYS = 7;

// Base used to build shareable booking-link URLs (bonza.app/book/<token>).
const APP_BOOKING_BASE = "bonza.app";

// Claude model powering the optimizer + chat advisor.
const CLAUDE_MODEL = "claude-opus-4-8";

module.exports = {
  DEV_USER,
  STRATEGIES,
  COMMISSION_RATES,
  BOOKING_LINK_TTL_DAYS,
  APP_BOOKING_BASE,
  CLAUDE_MODEL,
};
