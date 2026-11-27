// test/integration/fxRefresh.test.js — Phase 27 §27b. The daily FX snapshot persists GBP-base rates and the
// request path can read them back offline. Network-agnostic: getRates falls back to bundled rates without a
// live API, so the job always writes a row per quote currency.
import { describe, it, expect } from "vitest";
import { prisma } from "../factories/index.js";

const { refreshFxRates } = require("../../src/backend/jobs/fxRefreshJob");
const { getPersistedRates } = require("../../src/backend/services/fxService");

describe("fxRefreshJob", () => {
  it("persists GBP-base rates for today and reads them back", async () => {
    const result = await refreshFxRates();
    expect(result.written).toBeGreaterThan(0);
    expect(["live", "fallback", "persisted"]).toContain(result.source);

    const rows = await prisma.fxRate.findMany({ where: { base: "GBP" } });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.quote !== "GBP")).toBe(true); // base is never its own quote

    const persisted = await getPersistedRates();
    expect(typeof persisted.USD).toBe("number");
    expect(persisted.GBP).toBe(1);
  });

  it("upserts rather than duplicating when run twice for the same date", async () => {
    await refreshFxRates();
    await refreshFxRates();
    const usdRows = await prisma.fxRate.findMany({ where: { base: "GBP", quote: "USD" } });
    // One row per (base, quote, date) — a same-day re-run updates in place.
    const byDate = new Set(usdRows.map((r) => r.date.toISOString().slice(0, 10)));
    expect(usdRows.length).toBe(byDate.size);
  });
});
