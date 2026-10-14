// test/unit/withRetry.test.js — Phase 24 §24g. Retry only transient failures; never retry a 4xx (except
// 408/429); surface a timeout as a retryable AbortError. Small delays keep the test fast with real timers.
import { describe, it, expect, vi } from "vitest";

const { withRetry, withTimeout, isRetryable } = require("../../src/backend/utils/withRetry");

const fast = { baseMs: 1, maxMs: 2 };

describe("isRetryable", () => {
  it("retries connection resets, timeouts, 408/429 and 5xx", () => {
    expect(isRetryable({ code: "ECONNRESET" })).toBe(true);
    expect(isRetryable({ code: "ETIMEDOUT" })).toBe(true);
    expect(isRetryable({ status: 429 })).toBe(true);
    expect(isRetryable({ status: 503 })).toBe(true);
    expect(isRetryable({ name: "AbortError" })).toBe(true);
  });
  it("does not retry a 4xx (other than 408/429)", () => {
    expect(isRetryable({ status: 400 })).toBe(false);
    expect(isRetryable({ status: 404 })).toBe(false);
    expect(isRetryable(new Error("boom"))).toBe(false);
  });
});

describe("withRetry", () => {
  it("calls once and rethrows on a non-retryable error", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 400, message: "bad" });
    await expect(withRetry(fn, fast)).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable error up to `attempts`, then throws the last", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 503 });
    await expect(withRetry(fn, { attempts: 3, ...fast })).rejects.toMatchObject({ status: 503 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("returns the value once a retry succeeds", async () => {
    const fn = vi.fn().mockRejectedValueOnce({ status: 500 }).mockResolvedValue("ok");
    await expect(withRetry(fn, { attempts: 3, ...fast })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("withTimeout", () => {
  it("resolves a fast function", async () => {
    await expect(withTimeout(async () => "quick", 50)).resolves.toBe("quick");
  });

  it("rejects with a retryable AbortError when the function exceeds the budget", async () => {
    const slow = () => new Promise((r) => setTimeout(() => r("late"), 100));
    const err = await withTimeout((signal) => new Promise((resolve, reject) => {
      const t = setTimeout(() => resolve("late"), 100);
      signal.addEventListener("abort", () => { clearTimeout(t); reject(Object.assign(new Error("aborted"), { name: "AbortError" })); });
    }), 20, "slow").catch((e) => e);
    expect(err.name).toBe("AbortError");
    expect(isRetryable(err)).toBe(true);
    void slow;
  });
});
