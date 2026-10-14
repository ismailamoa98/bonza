// utils/withRetry.js — Phase 24 §24g. Retry with exponential backoff + jitter for transient upstream
// failures, and an AbortController-based timeout. NEVER wrap the money paths (Duffel order, Stripe PI
// confirm / sub create, credits writes, points transfer) — those use idempotency keys and a user-triggered
// retry, because an automatic retry risks a double charge or double transfer.
const { logger } = require("./logger");

const DEFAULTS = { attempts: 3, baseMs: 300, maxMs: 4000, jitter: true };

// Per-service timeouts (ms), enforced with AbortController. A timeout is a failure and counts toward health.
const TIMEOUTS = {
  seats_aero: 8000,
  duffel_search: 12000,
  duffel_order: 30000,
  rooms_aero: 8000,
  stripe: 15000,
  claude_stream: 25000,
  claude: 15000,
  resend: 10000,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isRetryable(err) {
  if (err?.name === "AbortError") return true; // our timeout
  if (err?.code === "ECONNRESET" || err?.code === "ETIMEDOUT") return true;
  const s = err?.status ?? err?.statusCode ?? err?.response?.status;
  return s === 408 || s === 429 || (s >= 500 && s <= 599);
}

async function withRetry(fn, opts = {}) {
  const { attempts, baseMs, maxMs, jitter } = { ...DEFAULTS, ...opts };
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || i === attempts - 1) break;
      const exp = Math.min(baseMs * 2 ** i, maxMs);
      const wait = jitter ? exp * (0.5 + Math.random() * 0.5) : exp;
      await sleep(wait);
    }
  }
  if (opts.label) logger.warn?.(`[withRetry] exhausted: ${opts.label}`, { message: lastError?.message });
  throw lastError;
}

// Run `fn(signal)` with a hard timeout; rejects with an AbortError (retryable) past `ms`. The signal is
// passed to fetch/SDK calls that honour it (so the socket is released); for clients that ignore it, the
// race still rejects so the caller never hangs.
async function withTimeout(fn, ms, label) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const e = new Error(`timeout after ${ms}ms${label ? ` (${label})` : ""}`);
      e.name = "AbortError";
      reject(e);
    }, ms);
  });
  try {
    return await Promise.race([Promise.resolve(fn(controller.signal)), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { withRetry, withTimeout, isRetryable, TIMEOUTS };
