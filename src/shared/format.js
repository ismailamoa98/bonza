// src/shared/format.js — Phase 27 §27b. THE single money/points formatting + conversion path, shared by the
// backend (CommonJS `require`) and the frontend (Vite transpiles the CJS default export → `import fmt from
// "@shared/format"`). Money moves through the app as **integer minor units** (pence for GBP) plus an ISO-4217
// currency code — never a float. Nothing else formats money inline; nothing stores money as a Float.
//
// Vocabulary:
//   minor units  — the smallest indivisible unit of the currency (pence, cents). GBP 2400 = £24.00.
//   major units  — the human amount (pounds, dollars). Only ever produced for display, never stored.

// ISO-4217 minor-unit exponents for the currencies Bonza touches. Most are 2; JPY has none. Anything not
// listed falls back to 2, which is correct for every currency the app currently supports.
const MINOR_DIGITS = {
  GBP: 2, USD: 2, EUR: 2, CAD: 2, AUD: 2, NZD: 2, CHF: 2, AED: 2, SAR: 2, SGD: 2,
  HKD: 2, INR: 2, CNY: 2, ZAR: 2, MXN: 2, BRL: 2, SEK: 2, NOK: 2, DKK: 2, PLN: 2, THB: 2,
  JPY: 0,
};

const DEFAULT_LOCALE = "en-GB";

function minorDigits(currency) {
  const d = MINOR_DIGITS[String(currency || "GBP").toUpperCase()];
  return d === undefined ? 2 : d;
}

// Round-half-up to the currency's minor unit, returning an INTEGER in minor units.
//   • half-away-from-zero: 0.005 → 1, -0.005 → -1 (JS `Math.round(-0.5)` is -0, i.e. half-towards-+∞).
//   • dodges the binary-float multiply trap: `1.005 * 100` is 100.4999… (→ 100), but the decimal 1.005 must
//     round to 101. We scale via exponential-notation string parsing — `Number("1.005e2")` is exactly 100.5
//     — so the half lands where a human expects. `major` is a human amount (16.50 → 1650; 0.005 → 1).
function roundHalfUpToMinor(major, currency = "GBP") {
  const digits = minorDigits(currency);
  const n = Number(major) || 0;
  const sign = Math.sign(n);
  const scaled = Number(`${Math.abs(n)}e${digits}`); // exact for the shortest-round-trip decimal string
  return sign * Math.round(scaled);
}

// Human amount → integer minor units. Alias of roundHalfUpToMinor with clearer intent at call sites that
// are converting a known-exact quote (rather than rounding a computed figure).
function toMinor(major, currency = "GBP") {
  return roundHalfUpToMinor(major, currency);
}

// Integer minor units → human amount (a Number — for arithmetic or legacy callers, NOT for display).
function fromMinor(amountMinor, currency = "GBP") {
  const factor = 10 ** minorDigits(currency);
  return (Number(amountMinor) || 0) / factor;
}

// Format an integer-minor-unit amount in its OWN currency. This is the exact-amount formatter (credits
// balance, booking total, service fee). Display-currency CONVERSION (GBP→viewer currency) is a separate
// concern handled by the frontend's utils/money.js, which calls through to here after converting.
//   formatMoney(2400, "GBP")                       → "£24.00"
//   formatMoney(2400, "GBP", { maximumFractionDigits: 0 }) → "£24"
//   formatMoney(190000, "JPY")                      → "¥1,900"
function formatMoney(amountMinor, currency = "GBP", { locale = DEFAULT_LOCALE, maximumFractionDigits } = {}) {
  const ccy = String(currency || "GBP").toUpperCase();
  const digits = minorDigits(ccy);
  const value = (Number(amountMinor) || 0) / 10 ** digits;
  const maxFrac = maximumFractionDigits === undefined ? digits : maximumFractionDigits;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: ccy,
      minimumFractionDigits: Math.min(digits, maxFrac),
      maximumFractionDigits: maxFrac,
    }).format(value);
  } catch {
    // Unknown currency / no Intl — degrade to a bare rounded figure rather than throwing in a render path.
    return `${value.toFixed(Math.max(0, maxFrac))}`;
  }
}

// Format a points/miles count (unitless integers — always grouped, never a currency).
//   formatPoints(124000) → "124,000"
function formatPoints(n, { locale = DEFAULT_LOCALE } = {}) {
  const num = Math.round(Number(n) || 0);
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(num);
  } catch {
    return String(num);
  }
}

module.exports = {
  MINOR_DIGITS,
  minorDigits,
  roundHalfUpToMinor,
  toMinor,
  fromMinor,
  formatMoney,
  formatPoints,
};
