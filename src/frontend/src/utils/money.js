// utils/money.js — display-currency conversion. All amounts in the app are GBP (that's what Duffel/Stripe
// charge); this converts them to the user's local currency for DISPLAY only, using live FX rates (fetched
// into the singleton) with a bundled fallback so it works instantly/offline. The actual charge stays GBP.

// Approx GBP→X fallback so the first paint is already localised before live rates load.
const FALLBACK = {
  GBP: 1, USD: 1.27, EUR: 1.17, CAD: 1.72, AUD: 1.92, NZD: 2.08, JPY: 190, CHF: 1.12,
  AED: 4.66, SAR: 4.76, SGD: 1.71, HKD: 9.9, INR: 106, CNY: 9.1, ZAR: 23, MXN: 22,
  BRL: 6.6, SEK: 13.4, NOK: 13.6, DKK: 8.7, PLN: 5.0, THB: 45,
};

// Region (ISO country) → currency for the currencies we support. EU members map to EUR.
const REGION_CCY = {
  GB: "GBP", US: "USD", CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY", CH: "CHF",
  AE: "AED", SA: "SAR", SG: "SGD", HK: "HKD", IN: "INR", CN: "CNY", ZA: "ZAR",
  MX: "MXN", BR: "BRL", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", TH: "THB",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", IE: "EUR", NL: "EUR", PT: "EUR",
  AT: "EUR", BE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
};

function browserLocale() {
  return (typeof navigator !== "undefined" && navigator.language) || "en-GB";
}

// Currency from an explicit override (localStorage), else the browser locale's region, else GBP.
export function detectCurrency() {
  try {
    const saved = typeof localStorage !== "undefined" && localStorage.getItem("bonza_ccy");
    if (saved && FALLBACK[saved]) return saved;
    const region = new Intl.Locale(browserLocale()).maximize().region;
    const ccy = REGION_CCY[region];
    return ccy && FALLBACK[ccy] ? ccy : "GBP";
  } catch {
    return "GBP";
  }
}

let _rates = { ...FALLBACK };
let _currency = detectCurrency();
let _locale = browserLocale();

const rateFor = (ccy) => _rates[ccy] || 1;

// Format a GBP amount in the active display currency (no minor units — matches the app's rounded style).
export function money(gbp) {
  const value = (Number(gbp) || 0) * rateFor(_currency);
  try {
    return new Intl.NumberFormat(_locale, { style: "currency", currency: _currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `£${Math.round(value).toLocaleString()}`;
  }
}

export function currentFx() {
  return { currency: _currency, rate: rateFor(_currency), locale: _locale, converted: _currency !== "GBP" };
}

// Merge live rates from GET /api/v1/fx (best-effort refinement over the fallback).
export function applyRates(rates) {
  if (rates && typeof rates === "object") _rates = { ..._rates, ...rates };
}

// Manual override (Settings). Persists so the choice sticks across sessions.
export function setDisplayCurrency(ccy) {
  if (!FALLBACK[ccy]) return;
  _currency = ccy;
  try {
    localStorage.setItem("bonza_ccy", ccy);
  } catch {
    /* ignore */
  }
}

export const SUPPORTED_CURRENCIES = Object.keys(FALLBACK);
