// test/unit/statementGuard.test.js — Phase 27 §27c. The plausibility gate is a pure function; these exercise
// every verdict/reason directly (no DB, injected clock) so the launch-blocking statement path is provable.
import { describe, it, expect } from "vitest";

const { evaluateStatement, bodyFingerprint, RULES } = require("../../src/backend/services/statementGuard");

const NOW = new Date("2026-06-15T12:00:00Z");
const base = { balance: 50000, confidence: 0.95, previousBalance: 48000, statementDate: new Date("2026-06-14"), now: NOW };

describe("evaluateStatement — apply", () => {
  it("applies a confident, plausible statement", () => {
    expect(evaluateStatement(base)).toEqual({ verdict: "apply", reason: "ok" });
  });

  it("applies a first statement (no previous balance) when confident", () => {
    expect(evaluateStatement({ ...base, previousBalance: null }).verdict).toBe("apply");
  });

  it("applies a genuine zero for a brand-new account", () => {
    expect(evaluateStatement({ ...base, balance: 0, previousBalance: null }).verdict).toBe("apply");
  });

  it("applies a large-but-plausible earn (4× under the 5× cap)", () => {
    expect(evaluateStatement({ ...base, balance: 48000 * 4, previousBalance: 48000 }).verdict).toBe("apply");
  });
});

describe("evaluateStatement — reject", () => {
  it("rejects a null balance", () => {
    expect(evaluateStatement({ ...base, balance: null })).toEqual({ verdict: "reject", reason: "no_balance" });
  });

  it("rejects a negative balance", () => {
    expect(evaluateStatement({ ...base, balance: -100 }).reason).toBe("negative_balance");
  });

  it("rejects an absurdly large balance", () => {
    expect(evaluateStatement({ ...base, balance: RULES.maxAbsolute + 1 }).reason).toBe("exceeds_max_absolute");
  });

  it("rejects a future-dated statement", () => {
    expect(evaluateStatement({ ...base, statementDate: new Date("2026-06-16") }).reason).toBe("future_dated");
  });

  it("rejects a statement older than the max age", () => {
    expect(evaluateStatement({ ...base, statementDate: new Date("2025-01-01") }).reason).toBe("too_old");
  });
});

describe("evaluateStatement — quarantine", () => {
  it("quarantines a low-confidence read even if plausible", () => {
    expect(evaluateStatement({ ...base, confidence: 0.35 })).toEqual({ verdict: "quarantine", reason: "low_confidence" });
  });

  it("quarantines an implausible jump up (> 5×)", () => {
    expect(evaluateStatement({ ...base, balance: 48000 * 6, previousBalance: 48000 }).reason).toBe("implausible_increase");
  });

  it("quarantines an implausible crash (the classic mis-scrape to ~0)", () => {
    expect(evaluateStatement({ ...base, balance: 10, previousBalance: 48000 }).reason).toBe("implausible_decrease");
  });

  it("quarantines a parsed 0 against a positive existing balance", () => {
    expect(evaluateStatement({ ...base, balance: 0, previousBalance: 48000 }).reason).toBe("implausible_decrease");
  });
});

describe("bodyFingerprint", () => {
  it("is stable and non-reversible (short hash, not the body)", () => {
    const body = "Your current balance is 124,000 points";
    const fp = bodyFingerprint(body);
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
    expect(fp).toBe(bodyFingerprint(body));
    expect(fp).not.toContain("124");
  });

  it("returns null for no body", () => {
    expect(bodyFingerprint(null)).toBeNull();
  });
});
