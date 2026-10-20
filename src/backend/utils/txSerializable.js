// utils/txSerializable.js — Phase 27 §27a. Runs a Prisma transaction at SERIALIZABLE isolation and retries on
// a serialization failure (Postgres SQLSTATE 40001). This is the ONE place retrying a write is correct: the
// transaction is all-or-nothing, so a retried serialization conflict re-runs cleanly. It does NOT contradict
// the never-retry rule in §24g, which is about non-idempotent OUTBOUND calls — keep those out of `fn`.
const prisma = require("../config/database");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function txSerializable(fn, { attempts = 3, timeout = 10_000 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: "Serializable", timeout });
    } catch (err) {
      const code = err.code ?? err.meta?.code;
      lastErr = err;
      if (code === "40001" && i < attempts - 1) {
        await sleep(50 * 2 ** i); // 50ms, 100ms, …
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

module.exports = { txSerializable };
