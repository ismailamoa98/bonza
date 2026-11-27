// test/mocks/anthropic.js — Phase 23. Anthropic SDK mocks. Rule: return PARSEABLE JSON matching each
// prompt's contract (prose would mask a parsing bug), and expose a failure/garbage variant so the parse
// sites' error handling (claudeOptimizer, personalisationJob, supportAssistant) is actually exercised.
// Usage (hoisting-safe): vi.mock("@anthropic-ai/sdk", () => anthropicMock(scenariosJson))
import { vi } from "vitest";

// A personalisation/hero recommendation array, the shape jobs/personalisationJob + destinations parse.
export const recommendationJson = JSON.stringify([
  {
    destination: "LIS",
    destinationCity: "Lisbon",
    origin: "LHR",
    specLine: "5 NTS · 5-STAR · TAP",
    rating: 8.4,
    pointsOption: { programme: "ba_avios", pointsCost: 18000, centsPerPoint: 1.3 },
    cashOption: { priceGbp: 280, creditsEarned: 8.4 },
    aiInsight: "3 seats left",
    whyPersonalised: "You searched Lisbon 3 times",
    bestOptionType: "points",
    pointsValueRating: "good",
    centsPerPoint: 1.3,
    cashSavingGbp: 120,
    creditsIfCash: 8.4,
  },
]);

// The optimiser scenario array (claudeOptimizer.generateScenarios parses a JSON array of scenarios).
export const scenariosJson = JSON.stringify([
  { id: "transfer", strategy: "transfer", title: "Transfer to partner", pointsUsed: 50000, cashCost: 0, summary: "x" },
  { id: "cash", strategy: "cash", title: "Pay cash", pointsUsed: 0, cashCost: 420, summary: "y" },
]);

// Prose (not JSON) — the failure case the parse sites must survive without crashing.
export const prose = "Sure! Here are some great ideas for your trip to Lisbon — it's lovely in spring.";

const textResponse = (text) => ({ content: [{ type: "text", text }] });

// A bare mock client (messages.create + beta.messages.create), for tests that call the SDK directly.
export function anthropicClient(text = recommendationJson) {
  const create = vi.fn().mockResolvedValue(textResponse(text));
  return { messages: { create }, beta: { messages: { create } } };
}

// Module object for `vi.mock("@anthropic-ai/sdk", () => anthropicMock())`.
export function anthropicMock(text = recommendationJson) {
  return { default: vi.fn(() => anthropicClient(text)) };
}

// Rejection variant — the API call throws; the parse sites must fall back gracefully.
export function anthropicRejectMock(err = new Error("anthropic timeout")) {
  return {
    default: vi.fn(function () {
      const create = vi.fn().mockRejectedValue(err);
      return { messages: { create }, beta: { messages: { create } } };
    }),
  };
}

// ── Controlled mock (registered once in a setup file) ───────────────────────────
// SUT-internal require() of @anthropic-ai/sdk is only intercepted when the mock is
// registered from a SETUP file (priming the module graph before the SUT loads). So the
// setup file installs THIS mock, whose client reads a shared, mutable `control` at call
// time; a test steers the response via setAnthropic()/resetAnthropic().
export const control = { reply: recommendationJson, reject: false };
export function setAnthropic(next) {
  Object.assign(control, next);
}
export function resetAnthropic() {
  control.reply = recommendationJson;
  control.reject = false;
}
export function anthropicMockControlled() {
  return {
    default: vi.fn(function () {
      const create = vi.fn(async () => {
        if (control.reject) throw new Error("anthropic timeout");
        return { content: [{ type: "text", text: control.reply }] };
      });
      return { messages: { create }, beta: { messages: { create } } };
    }),
  };
}
