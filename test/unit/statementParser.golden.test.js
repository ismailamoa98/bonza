// test/unit/statementParser.golden.test.js — Phase 27 §27c. The golden-file parser harness. Every synthetic
// fixture under test/fixtures/statements/<programme>/*.json is a labelled email body with the balance we
// expect extractBalance to read. The parser must hit §23's 95% correctness bar across the whole corpus, and
// — the hard rule — the raw body must never leak into what we'd persist (we only keep matchedPattern + a
// non-reversible fingerprint). Real redacted statements get dropped into these same folders later.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { extractBalance, PROGRAMME_PATTERNS } = require("../../src/backend/services/emailLoyaltySync");
const { bodyFingerprint } = require("../../src/backend/services/statementGuard");

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/statements");

function loadFixtures() {
  const out = [];
  for (const programme of fs.readdirSync(ROOT)) {
    const dir = path.join(ROOT, programme);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      const fx = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
      out.push({ ...fx, programme: fx.programme || programme, file: `${programme}/${file}` });
    }
  }
  return out;
}

const FIXTURES = loadFixtures();

describe("statement parser golden files", () => {
  it("loads a non-empty corpus", () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(8);
  });

  it("parses every fixture to the expected balance (≥95% of the corpus)", () => {
    let correct = 0;
    const misses = [];
    for (const fx of FIXTURES) {
      const patterns = PROGRAMME_PATTERNS[fx.programme] || {};
      const r = extractBalance(fx.body, patterns);
      const got = r ? r.balance : null;
      if (got === fx.expect.balance) correct += 1;
      else misses.push(`${fx.file}: expected ${fx.expect.balance}, got ${got}`);
    }
    const rate = correct / FIXTURES.length;
    expect(rate, `misses:\n${misses.join("\n")}`).toBeGreaterThanOrEqual(0.95);
  });

  it("meets the per-fixture confidence floor and matched pattern", () => {
    for (const fx of FIXTURES) {
      const patterns = PROGRAMME_PATTERNS[fx.programme] || {};
      const r = extractBalance(fx.body, patterns);
      expect(r, `${fx.file} produced no match`).not.toBeNull();
      expect(r.confidence, fx.file).toBeGreaterThanOrEqual(fx.expect.minConfidence ?? 0);
      if (fx.expect.matchedPattern) expect(r.matchedPattern, fx.file).toBe(fx.expect.matchedPattern);
    }
  });

  // The hard rule: the only thing we keep about a body is a non-reversible fingerprint — a short hash that
  // the body itself never contains (so no raw statement text could be reconstructed from telemetry).
  it("fingerprints a body without leaking its content", () => {
    for (const fx of FIXTURES) {
      const fp = bodyFingerprint(fx.body);
      expect(fp).toMatch(/^[0-9a-f]{16}$/);
      expect(fx.body.includes(fp)).toBe(false);
    }
  });
});
