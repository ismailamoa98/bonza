// services/fxService.js — GBP→currency FX rates for display conversion (prices/charges stay GBP).
// Live rates from the keyless Frankfurter API (ECB), cached; a bundled fallback keeps it working offline.
const axios = require("axios");
const { logger } = require("../utils/logger");

// Approx GBP→X fallback (used offline / on API failure). Refreshed live when reachable.
const FALLBACK = {
  GBP: 1, USD: 1.27, EUR: 1.17, CAD: 1.72, AUD: 1.92, NZD: 2.08, JPY: 190, CHF: 1.12,
  AED: 4.66, SAR: 4.76, SGD: 1.71, HKD: 9.9, INR: 106, CNY: 9.1, ZAR: 23, MXN: 22,
  BRL: 6.6, SEK: 13.4, NOK: 13.6, DKK: 8.7, PLN: 5.0, THB: 45,
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
let cache = null; // { at, rates }

async function getRates() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return { rates: cache.rates, source: "live", asOf: cache.at };
  try {
    const symbols = Object.keys(FALLBACK).filter((c) => c !== "GBP" && !c.endsWith("_")).join(",");
    const { data } = await axios.get("https://api.frankfurter.app/latest", {
      params: { from: "GBP", to: symbols },
      timeout: 5000,
    });
    if (data?.rates) {
      const rates = { GBP: 1, ...data.rates };
      cache = { at: Date.now(), rates };
      return { rates, source: "live", asOf: cache.at };
    }
  } catch (err) {
    logger.warn("FX rate fetch failed — using fallback", { error: err.message });
  }
  return { rates: { ...FALLBACK }, source: "fallback", asOf: Date.now() };
}

module.exports = { getRates, FALLBACK };
