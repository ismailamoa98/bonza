// src/frontend/src/utils/searchUrl.test.js — Phase 23. The /search query-string builder/reader. All search
// state lives in the URL (shareable, reloadable), so the build→parse round-trip and the P20 oneway/flex and
// metro-origin flags must be exact. Pure logic — no DOM needed, runs in the frontend (jsdom) project.
import { describe, it, expect } from "vitest";
import { buildSearchUrl, parseSearchParams, exploreOriginFor, defaultTripDates } from "./searchUrl.js";

const paramsOf = (url) => new URLSearchParams(url.split("?")[1]);

describe("buildSearchUrl / parseSearchParams round-trip", () => {
  it("carries origin, destination, dates and party through a round-trip", () => {
    const url = buildSearchUrl({ origin: "LHR", destination: "LIS", departureDate: "2026-05-01", returnDate: "2026-05-06", travelers: 3, style: "points_max" });
    const parsed = parseSearchParams(paramsOf(url));
    expect(parsed.origin).toBe("LHR");
    expect(parsed.destination).toBe("LIS");
    expect(parsed.departureDate).toBe("2026-05-01");
    expect(parsed.returnDate).toBe("2026-05-06");
    expect(parsed.travelers).toBe(3);
    expect(parsed.style).toBe("points_max");
  });

  it("joins dates as a single dep_ret pair", () => {
    const url = buildSearchUrl({ origin: "LHR", destination: "LIS", departureDate: "2026-05-01", returnDate: "2026-05-06" });
    expect(paramsOf(url).get("dates")).toBe("2026-05-01_2026-05-06");
  });

  it("drops the return date and flags a one-way trip", () => {
    const url = buildSearchUrl({ origin: "LHR", destination: "LIS", departureDate: "2026-05-01", returnDate: "2026-05-06", oneway: true });
    expect(paramsOf(url).get("dates")).toBe("2026-05-01");
    expect(paramsOf(url).get("oneway")).toBe("1");
  });

  it("carries a flexibility window", () => {
    expect(paramsOf(buildSearchUrl({ origin: "LHR", destination: "LIS", flex: 7 })).get("flex")).toBe("7");
  });

  it("widens the origin to its metro area when nearby is set", () => {
    const url = buildSearchUrl({ origin: "LHR", destination: "LIS", nearby: true });
    const p = paramsOf(url);
    expect(p.get("from")).toBe("LON");
    expect(p.get("nearby")).toBe("1");
  });

  it("omits an economy cabin but keeps a premium one", () => {
    expect(paramsOf(buildSearchUrl({ origin: "LHR", destination: "LIS", cabin: "economy" })).has("cabin")).toBe(false);
    expect(paramsOf(buildSearchUrl({ origin: "LHR", destination: "LIS", cabin: "business" })).get("cabin")).toBe("business");
  });
});

describe("exploreOriginFor", () => {
  it("folds London airports into LON and defaults unknown to LON", () => {
    expect(exploreOriginFor("LGW")).toBe("LON");
    expect(exploreOriginFor("MAN")).toBe("MAN");
    expect(exploreOriginFor("ZZZ")).toBe("LON");
  });
});

describe("defaultTripDates", () => {
  it("returns a valid future ISO range", () => {
    const { departureDate, returnDate } = defaultTripDates(5);
    expect(departureDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(returnDate) > new Date(departureDate)).toBe(true);
    expect(new Date(departureDate) > new Date()).toBe(true);
  });
});
