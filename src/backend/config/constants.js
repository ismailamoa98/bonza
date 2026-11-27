// config/constants.js — shared constants: model id, strategies, commission + cashback rates.

const DEV_USER = {
  id: "user_dev_demo",
  email: "demo@bonza.app",
  name: "Demo Traveler",
  location: "New York, NY",
  travelStatus: "gold",
};

const STRATEGIES = ["transfer", "status", "cash", "hybrid", "direct"];

const COMMISSION_RATES = { flight: 0.03, hotel: 0.12, car: 0.1 };

const CASHBACK_RATE = 0.03;
// Cashback applies to higher-margin legs only. Flights earn Bonza just ~3% commission, which 3% cashback
// would wipe out (loss-making after Stripe fees) — so flight cash earns no Bonza Credits.
const CASHBACK_LEGS = ["hotel", "car"];
const cashbackRateFor = (leg) => (CASHBACK_LEGS.includes(leg) ? CASHBACK_RATE : 0);
const CREDIT_EXPIRY_MONTHS = 24;

const BOOKING_LINK_TTL_DAYS = 7;

const APP_BOOKING_BASE = "bonza.app";

const CLAUDE_MODEL = "claude-opus-4-8";

module.exports = {
  DEV_USER,
  STRATEGIES,
  COMMISSION_RATES,
  CASHBACK_RATE,
  CASHBACK_LEGS,
  cashbackRateFor,
  CREDIT_EXPIRY_MONTHS,
  BOOKING_LINK_TTL_DAYS,
  APP_BOOKING_BASE,
  CLAUDE_MODEL,
};
