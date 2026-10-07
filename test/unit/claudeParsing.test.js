// test/unit/claudeParsing.test.js — Phase 23. The optimiser/advisor OFFLINE contract — the path that runs
// in dev and whenever no real Anthropic key is present (the default here; the setup file forces it). This
// is real logic: the 5-scenario generator and the keyword-routed chat advisor. (The live-API JSON-parse
// branch is only reachable with a real key making a real call, which the no-network rule forbids in unit
// tests and which this harness can't mock at the SUT's lazy require; it's covered end-to-end in E2E.)
import { describe, it, expect } from "vitest";
import { STRATEGIES } from "../../src/backend/config/constants.js";

const { generateScenarios, chatReply } = require("../../src/backend/utils/claudeOptimizer");

const trip = { origin: "LHR", destination: "LIS", departureDate: "2026-05-01", returnDate: "2026-05-06" };
const loyalty = { amex: 120000, chaseUr: 80000 };

describe("generateScenarios (offline)", () => {
  it("returns the five strategies with exactly one recommended", async () => {
    const out = await generateScenarios(trip, loyalty);
    expect(out.scenarios).toHaveLength(5);
    expect(out.scenarios.filter((s) => s.isRecommended)).toHaveLength(1);
    const strategies = out.scenarios.map((s) => s.strategy).sort();
    expect(strategies).toEqual([...STRATEGIES].sort());
  });

  it("produces a numeric recommendedRatio and an opening analysis", async () => {
    const out = await generateScenarios(trip, loyalty);
    expect(typeof out.recommendedRatio).toBe("number");
    expect(typeof out.conversationalAnalysis).toBe("string");
    expect(out.conversationalAnalysis.length).toBeGreaterThan(0);
  });

  it("every scenario carries a per-category vendor menu so the UI can recompute", async () => {
    const out = await generateScenarios(trip, loyalty);
    for (const s of out.scenarios) {
      expect(Array.isArray(s.flightDetails.vendors)).toBe(true);
      expect(Array.isArray(s.hotelDetails.vendors)).toBe(true);
      expect(Array.isArray(s.carDetails.vendors)).toBe(true);
    }
  });
});

describe("chatReply (offline advisor routing)", () => {
  const scenarios = [
    { id: "s_transfer", strategy: "transfer", savingsAmount: 2100, isRecommended: true },
    { id: "s_status", strategy: "status", savingsAmount: 900 },
    { id: "s_cash", strategy: "cash", savingsAmount: 0 },
  ];

  it("routes a flexibility question to the status scenario", async () => {
    const out = await chatReply({ trip, scenarios, selectedScenarioId: null, message: "what if my plans are flexible?", history: [] });
    expect(out.shouldHighlightCard).toBe("s_status");
    expect(out.response).toMatch(/flexib|status/i);
  });

  it("routes a value/transfer question to the recommended scenario", async () => {
    const out = await chatReply({ trip, scenarios, selectedScenarioId: null, message: "how do transfers work?", history: [] });
    expect(out.shouldHighlightCard).toBe("s_transfer");
    expect(typeof out.response).toBe("string");
  });

  it("always returns a non-empty advisory string and a highlight", async () => {
    const out = await chatReply({ trip, scenarios, selectedScenarioId: null, message: "hello", history: [] });
    expect(out.response.length).toBeGreaterThan(0);
    expect(out.shouldHighlightCard).toBeTruthy();
  });
});
