// utils/rateLimitStore.js — Phase 27 §27d. A shared (cross-instance) store for express-rate-limit v8, backed
// by the RateLimitHit table. The default memory store counts per-process, so on >1 worker a caller just lands
// on another instance to reset their limit — the limits are fiction in prod. This store makes them real: one
// row per limiter-prefixed key holds the current fixed window's count + resetAt, updated by a single atomic
// upsert. It is deliberately FAIL-OPEN — any DB error allows the request (a rate-limit store hiccup must never
// turn into a site-wide 500). Expired rows are swept by the nightly rate_limit_cleanup job.
const prisma = require("./../config/database");
const { logger } = require("./logger");

class PrismaRateLimitStore {
  // `prefix` isolates limiters that share the table (e.g. "search", "optimize", "ip_global").
  constructor({ prefix = "rl" } = {}) {
    this.prefix = prefix;
    this.windowMs = 60_000; // overwritten by init() with the limiter's configured window
  }

  // express-rate-limit calls this once with the limiter's options.
  init(options) {
    if (options && options.windowMs) this.windowMs = options.windowMs;
  }

  _key(key) {
    return `${this.prefix}:${key}`;
  }

  // Atomic fixed-window increment. INSERT the window, or on conflict either start a fresh window (past resetAt)
  // or increment within it. RETURNING gives us the post-update count + the window end.
  async increment(key) {
    const k = this._key(key);
    const resetAt = new Date(Date.now() + this.windowMs);
    try {
      const rows = await prisma.$queryRaw`
        INSERT INTO "RateLimitHit" (key, count, "resetAt")
        VALUES (${k}, 1, ${resetAt})
        ON CONFLICT (key) DO UPDATE
          SET count = CASE WHEN "RateLimitHit"."resetAt" < now() THEN 1 ELSE "RateLimitHit".count + 1 END,
              "resetAt" = CASE WHEN "RateLimitHit"."resetAt" < now() THEN ${resetAt} ELSE "RateLimitHit"."resetAt" END
        RETURNING count, "resetAt"`;
      const row = rows[0];
      return { totalHits: row.count, resetTime: row.resetAt };
    } catch (err) {
      // Fail-open: allow the request, but don't let the limiter think a window is active.
      logger.warn?.("[rateLimitStore] increment failed — failing open", { prefix: this.prefix, error: err.message });
      return { totalHits: 1, resetTime: resetAt };
    }
  }

  async decrement(key) {
    try {
      await prisma.$executeRaw`
        UPDATE "RateLimitHit" SET count = GREATEST(count - 1, 0)
        WHERE key = ${this._key(key)} AND "resetAt" >= now()`;
    } catch (err) {
      logger.warn?.("[rateLimitStore] decrement failed", { prefix: this.prefix, error: err.message });
    }
  }

  async resetKey(key) {
    try {
      await prisma.$executeRaw`DELETE FROM "RateLimitHit" WHERE key = ${this._key(key)}`;
    } catch (err) {
      logger.warn?.("[rateLimitStore] resetKey failed", { prefix: this.prefix, error: err.message });
    }
  }
}

module.exports = { PrismaRateLimitStore };
