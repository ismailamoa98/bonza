// test/unit/requestContext.test.js — Phase 27 §27i. The AsyncLocalStorage correlation context: ids stay
// isolated across concurrent async contexts, mutation (userId filled after auth) sticks, and everything
// degrades to undefined outside a context (never throws).
import { describe, it, expect } from "vitest";

const requestContext = require("../../src/backend/utils/requestContext");

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("requestContext", () => {
  it("returns undefined outside any context", () => {
    expect(requestContext.get()).toBeUndefined();
    expect(requestContext.getRequestId()).toBeUndefined();
  });

  it("set() is a no-op (no throw) outside a context", () => {
    expect(() => requestContext.set("userId", "x")).not.toThrow();
    expect(requestContext.getRequestId()).toBeUndefined();
  });

  it("exposes the seeded id and lets userId be set mid-context", async () => {
    await requestContext.run({ requestId: "req-1" }, async () => {
      expect(requestContext.getRequestId()).toBe("req-1");
      expect(requestContext.get().userId).toBeUndefined();
      requestContext.set("userId", "user_abc");
      await tick();
      expect(requestContext.get().userId).toBe("user_abc"); // survives an await
    });
  });

  it("keeps ids isolated across concurrent contexts", async () => {
    const seen = [];
    const one = requestContext.run({ requestId: "A" }, async () => {
      await tick();
      requestContext.set("userId", "ua");
      await tick();
      seen.push(`${requestContext.getRequestId()}:${requestContext.get().userId}`);
    });
    const two = requestContext.run({ requestId: "B" }, async () => {
      requestContext.set("userId", "ub");
      await tick();
      seen.push(`${requestContext.getRequestId()}:${requestContext.get().userId}`);
    });
    await Promise.all([one, two]);
    expect(seen.sort()).toEqual(["A:ua", "B:ub"]);
  });
});
