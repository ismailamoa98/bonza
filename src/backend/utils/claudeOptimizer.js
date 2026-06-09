// utils/claudeOptimizer.js — Claude API calls (optimizer + chat advisor).
//
// Uses the official @anthropic-ai/sdk with Claude Opus 4.8 and adaptive
// thinking. The SDK is required lazily and only when a real ANTHROPIC_API_KEY
// is configured, so the server still boots and runs on mock data when the key
// is the dev placeholder or the SDK isn't installed yet. Any failure on the
// Claude path falls back to deterministic mock generation.
const env = require("../config/env");
const { CLAUDE_MODEL, STRATEGIES } = require("../config/constants");
const { generateMockScenarios } = require("./mockDataGenerator");

const BONZA_SYSTEM_PROMPT = `You are Bonza, an expert AI travel optimizer. You help users get the most value
from their loyalty points (AMEX, Chase, United, Marriott, etc.) when booking flights, hotels, and cars.

Speak like a smart, friendly friend: clear, conversational, never condescending, and free of loyalty-program
jargon. Be honest about trade-offs, never oversell, and never invent award availability or guarantee upgrades
(say "usually" not "will"). Always analyze all 5 strategies — transfer, status, cash, hybrid, direct — and
present the best one first with specific numbers and the reasoning behind it.`;

// Calls the Messages API and returns the concatenated text output.
async function callClaude(userContent, maxTokens) {
  // Lazy require so a missing SDK never breaks the mock path.
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    system: BONZA_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

// Strips ```json fences and parses the first JSON object in a string.
function parseJsonResponse(text) {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in Claude response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Generates the 5 scenarios + opening analysis for a trip.
// Returns { scenarios: [...], conversationalAnalysis }. Exactly one scenario
// is flagged isRecommended.
async function generateScenarios(trip, loyaltyPoints) {
  if (env.hasRealAnthropicKey) {
    try {
      const userContent =
        `Generate exactly 5 travel optimization scenarios for this trip and respond with ONLY JSON ` +
        `of shape {"scenarios":[...],"conversationalAnalysis":"..."}. Each scenario must have: ` +
        `strategy (one of ${STRATEGIES.join("/")}), totalCashCost (int USD), pointsUsed (int), ` +
        `pointsProgram (string), flightDetails (object), hotelDetails (object), carDetails (object), ` +
        `benefits (string array), reasoning (string), valueMultiplier (float), savingsAmount (int USD), ` +
        `isRecommended (boolean, true for exactly one). Each of flightDetails/hotelDetails/carDetails ` +
        `should include selectedVendorId and a vendors array, where each vendor has ` +
        `{id, vendor, label, cashCost (int), cashValue (int retail price), pointsCost (int; 0 for ` +
        `cash-only), pointsProgram, benefits (string array), recommended (boolean)}. Also include a ` +
        `top-level recommendedRatio (0..1: optimal fraction to pay with points). Savings is measured ` +
        `against retail: at ratio r, savings = r × sum of award-vendor cashValue.\n\n` +
        `Trip: ${JSON.stringify(trip)}\nLoyalty points: ${JSON.stringify(loyaltyPoints)}`;

      const text = await callClaude(userContent, 4096);
      const parsed = parseJsonResponse(text);
      if (Array.isArray(parsed.scenarios) && parsed.scenarios.length > 0) {
        // Guarantee exactly one recommended scenario.
        if (!parsed.scenarios.some((s) => s.isRecommended)) {
          parsed.scenarios[0].isRecommended = true;
        }
        if (typeof parsed.recommendedRatio !== "number") parsed.recommendedRatio = 1;
        return parsed;
      }
    } catch (err) {
      console.error("[claudeOptimizer] optimize failed, using mock:", err.message);
    }
  }
  return generateMockScenarios(trip, loyaltyPoints);
}

// Deterministic, offline reply used when Claude is unavailable.
function mockChatReply({ scenarios, selectedScenarioId, message }) {
  const recommended = scenarios.find((s) => s.isRecommended) || scenarios[0];
  let highlight = selectedScenarioId || (recommended && recommended.id);
  let response;

  if (/flex/i.test(message)) {
    const status = scenarios.find((s) => s.strategy === "status");
    if (status) highlight = status.id;
    response =
      "If flexibility matters most, the Status strategy is better for you — paid bookings give you " +
      "free changes on both flight and hotel. You spend a bit more cash but gain peace of mind.";
  } else if (/cash|pay/i.test(message)) {
    if (recommended) highlight = recommended.id;
    response =
      "Paying all cash works if you want to keep your points, but you'd spend about $2,500 and get " +
      "the least value. The transfer strategy gets you business class and saves roughly $2,100.";
  } else if (/transfer|complicated|how/i.test(message)) {
    if (recommended) highlight = recommended.id;
    response =
      "Transfers are easier than they sound: log into AMEX, pick the airline, enter the points, and " +
      "submit — it's instant and takes about two minutes. I'll send you the exact link when you book.";
  } else {
    response =
      "Happy to dig into any of these. The transfer strategy is my top pick for value, but tell me " +
      "what matters most — maximum value, flexibility, or earning points — and I'll tailor it.";
  }

  return { response, updatedSelectedScenarioId: highlight, shouldHighlightCard: highlight };
}

// Handles a chat turn: returns { response, updatedSelectedScenarioId, shouldHighlightCard }.
async function chatReply({ trip, scenarios, selectedScenarioId, message, history }) {
  if (env.hasRealAnthropicKey) {
    try {
      const userContent =
        `Continue advising the traveler. Respond with ONLY JSON of shape ` +
        `{"response":"...","updatedSelectedScenarioId":"<scenario id or null>",` +
        `"shouldHighlightCard":"<scenario id>"}. Pick the scenario id that best matches what the ` +
        `user now wants.\n\nTrip: ${JSON.stringify(trip)}\n` +
        `Scenarios: ${JSON.stringify(
          scenarios.map((s) => ({ id: s.id, strategy: s.strategy, savingsAmount: s.savingsAmount }))
        )}\n` +
        `Currently selected: ${selectedScenarioId || "none"}\n` +
        `Conversation so far: ${JSON.stringify(history || [])}\n` +
        `User message: ${message}`;

      const text = await callClaude(userContent, 1500);
      const parsed = parseJsonResponse(text);
      if (parsed && typeof parsed.response === "string") {
        return {
          response: parsed.response,
          updatedSelectedScenarioId: parsed.updatedSelectedScenarioId || selectedScenarioId || null,
          shouldHighlightCard:
            parsed.shouldHighlightCard || parsed.updatedSelectedScenarioId || selectedScenarioId || null,
        };
      }
    } catch (err) {
      console.error("[claudeOptimizer] chat failed, using mock:", err.message);
    }
  }
  return mockChatReply({ scenarios, selectedScenarioId, message });
}

module.exports = { generateScenarios, chatReply, BONZA_SYSTEM_PROMPT };
