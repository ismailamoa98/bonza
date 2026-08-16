// services/reviewInsightsService.js — derive per-property aspect scores (Location, Comfort, Facilities)
// from review text and RECORD them (PropertyInsight, keyed by Google place_id, refreshed weekly). Uses
// Claude when a key is present, else a deterministic keyword/sentiment fallback. Stores only our derived
// analysis — never the raw review text (ToS). Never throws.
const env = require("../config/env");
const prisma = require("../config/database");
const { CLAUDE_MODEL } = require("../config/constants");
const { logger } = require("../utils/logger");

const FRESH_MS = 7 * 24 * 60 * 60 * 1000; // re-analyse at most weekly
const ASPECTS = ["location", "comfort", "facilities"];

const clamp10 = (n) => Math.max(0, Math.min(10, Math.round((Number(n) || 0) * 10) / 10));

// ── Keyword/sentiment fallback (offline / no key / parse failure) ──────────────
const ASPECT_KEYWORDS = {
  location: ["location", "located", "central", "centre", "center", "walk", "distance", "area", "neighbourhood", "neighborhood", "close", "near", "station", "metro", "beach", "view", "transport"],
  comfort: ["comfort", "comfortable", "bed", "room", "quiet", "spacious", "cozy", "cosy", "sleep", "noise", "noisy", "bathroom", "shower", "clean", "spotless"],
  facilities: ["facilities", "pool", "gym", "spa", "breakfast", "restaurant", "bar", "wifi", "wi-fi", "parking", "amenities", "fitness", "food", "lounge"],
};
const POS = ["great", "excellent", "amazing", "lovely", "perfect", "good", "clean", "spotless", "comfortable", "fantastic", "wonderful", "best", "spacious", "friendly", "helpful", "superb", "beautiful", "recommend", "stunning"];
const NEG = ["bad", "poor", "dirty", "noisy", "small", "rude", "broken", "worst", "terrible", "disappointing", "uncomfortable", "dated", "smell", "cold", "cramped", "tired", "overpriced"];

function keywordScore(reviews, aspect, fallback) {
  const kws = ASPECT_KEYWORDS[aspect];
  let pos = 0;
  let neg = 0;
  let mentions = 0;
  for (const rv of reviews) {
    const sentences = String(rv.text || "").toLowerCase().split(/[.!?\n]+/);
    for (const s of sentences) {
      if (!kws.some((k) => s.includes(k))) continue;
      mentions += 1;
      for (const w of POS) if (s.includes(w)) pos += 1;
      for (const w of NEG) if (s.includes(w)) neg += 1;
    }
  }
  if (!mentions) return fallback; // no signal → lean on the overall rating
  return clamp10(6.5 + (5 * (pos - neg)) / (pos + neg + 1));
}

function keywordInsights(reviews, rating) {
  const fallback = rating ? clamp10((rating / 5) * 10) : 7.0; // rating is /5
  const scores = {};
  for (const a of ASPECTS) scores[a] = keywordScore(reviews, a, fallback);
  const top = ASPECTS.reduce((b, a) => (scores[a] > scores[b] ? a : b), ASPECTS[0]);
  return {
    ...scores,
    summary: `Guests most consistently praise the ${top}.`,
    source: "keyword",
  };
}

// ── Claude analysis ────────────────────────────────────────────────────────────
async function claudeInsights(reviews, name) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const joined = reviews
    .map((r, i) => `Review ${i + 1}: ${r.text}`)
    .join("\n\n")
    .slice(0, 6000);

  const prompt = `You are analysing genuine guest reviews for the hotel "${name || "this property"}".
Based ONLY on these reviews, score three aspects from 0 to 10 (one decimal, 10 = excellent):
Location, Comfort, Facilities. Then write ONE short sentence (max 18 words) capturing the property's
standout qualities and any recurring complaint. Respond with STRICT JSON only, no other text:
{"location": <number>, "comfort": <number>, "facilities": <number>, "summary": <string>}

Reviews:
${joined}`;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));

  return {
    location: clamp10(json.location),
    comfort: clamp10(json.comfort),
    facilities: clamp10(json.facilities),
    summary: String(json.summary || "").slice(0, 200),
    source: "claude",
  };
}

// Public: return recorded aspect insights for a property, computing + persisting when stale/missing.
async function getAspectInsights({ placeId, name, city, reviews = [], rating }) {
  const texts = reviews.filter((r) => r && r.text && r.text.trim().length);
  if (!texts.length) return null; // nothing to analyse

  // Serve a fresh recorded insight if we have one.
  if (placeId) {
    try {
      const existing = await prisma.propertyInsight.findUnique({ where: { placeId } });
      if (existing && Date.now() - new Date(existing.updatedAt).getTime() < FRESH_MS) {
        return {
          location: existing.location,
          comfort: existing.comfort,
          facilities: existing.facilities,
          summary: existing.summary,
          sampleSize: existing.sampleSize,
          source: existing.source,
        };
      }
    } catch (err) {
      logger.warn("PropertyInsight read failed", { placeId, error: err.message });
    }
  }

  let insight;
  if (env.hasRealAnthropicKey) {
    try {
      insight = await claudeInsights(texts, name);
    } catch (err) {
      logger.warn("Claude aspect analysis failed — using keyword fallback", { name, error: err.message });
    }
  }
  if (!insight) insight = keywordInsights(texts, rating);

  const result = { ...insight, sampleSize: texts.length };

  if (placeId) {
    try {
      await prisma.propertyInsight.upsert({
        where: { placeId },
        create: {
          placeId,
          name: name || null,
          city: city || null,
          location: result.location,
          comfort: result.comfort,
          facilities: result.facilities,
          summary: result.summary || null,
          sampleSize: result.sampleSize,
          rating: rating ?? null,
          source: result.source,
        },
        update: {
          name: name || null,
          city: city || null,
          location: result.location,
          comfort: result.comfort,
          facilities: result.facilities,
          summary: result.summary || null,
          sampleSize: result.sampleSize,
          rating: rating ?? null,
          source: result.source,
        },
      });
    } catch (err) {
      logger.warn("PropertyInsight upsert failed", { placeId, error: err.message });
    }
  }

  return result;
}

module.exports = { getAspectInsights };
