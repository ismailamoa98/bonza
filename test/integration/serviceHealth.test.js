// test/integration/serviceHealth.test.js — Phase 24 §24f. Crossing the failure threshold flips the mapped
// ServiceStatus row to degraded (what /status + the inline amber banners read); a clean window flips it back.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "../factories/index.js";

const health = require("../../src/backend/services/serviceHealth");

beforeEach(() => health.__reset());
afterEach(() => vi.useRealTimers());

async function seedRow(service) {
  await prisma.serviceStatus.create({ data: { service, displayName: service, state: "operational" } });
}
const stateOf = async (service) => (await prisma.serviceStatus.findUnique({ where: { service } }))?.state;

describe("serviceHealth", () => {
  it("flips the mapped row to degraded after 5 failures in the window", async () => {
    await seedRow("award_search"); // seats_aero maps here
    for (let i = 0; i < 4; i++) await health.recordFailure("seats_aero", { status: 503 });
    expect(await stateOf("award_search")).toBe("operational"); // below threshold
    await health.recordFailure("seats_aero", { status: 503 }); // 5th
    expect(await stateOf("award_search")).toBe("degraded");
  });

  it("recovers to operational after a clean window", async () => {
    await seedRow("payments"); // stripe maps here
    for (let i = 0; i < 5; i++) await health.recordFailure("stripe", { status: 500 });
    expect(await stateOf("payments")).toBe("degraded");

    // Advance only Date past the 2-minute window so the old failures prune out, then a success recovers.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 3 * 60 * 1000);
    await health.recordSuccess("stripe");
    expect(await stateOf("payments")).toBe("operational");
  });

  it("does not touch an unmapped service", async () => {
    await expect(health.recordFailure("unknown_service", { status: 500 })).resolves.toBeUndefined();
  });
});
