// test/integration/jobRunner.test.js — Phase 27 §27f. The job orchestration wrapper: lease-guarded single
// runner, a JobRun record per execution (including lease-held skips and errors), lease release in a finally,
// and self-expiry of a crashed holder's lease. Plus the read-only /admin/jobs view.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { asGuest } from "../helpers/auth.js";
import { prisma } from "../factories/index.js";

const app = require("../../src/backend/server");
const { runJob, acquireLease, releaseLease } = require("../../src/backend/utils/jobRunner");
const { handler } = require("../../src/backend/lambda/handler");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const runsFor = (name) => prisma.jobRun.findMany({ where: { name }, orderBy: { startedAt: "asc" } });
const lease = (name) => prisma.jobLease.findUnique({ where: { name } });

describe("runJob — single-runner lease", () => {
  it("runs the body, records a success JobRun, and releases the lease", async () => {
    let ran = 0;
    const { skipped, result } = await runJob({ name: "test_ok" }, async (ctx) => {
      ran += 1;
      ctx.items = 3;
      ctx.externalCalls = 1;
      return "done";
    });

    expect(skipped).toBe(false);
    expect(result).toBe("done");
    expect(ran).toBe(1);

    const runs = await runsFor("test_ok");
    expect(runs).toHaveLength(1);
    expect(runs[0].outcome).toBe("success");
    expect(runs[0].items).toBe(3);
    expect(runs[0].externalCalls).toBe(1);
    expect(runs[0].finishedAt).not.toBeNull();
    expect(await lease("test_ok")).toBeNull(); // released in finally
  });

  it("§27i — runs inside a correlation context and persists the requestId on the JobRun", async () => {
    const requestContext = require("../../src/backend/utils/requestContext");
    let seenInBody;
    await runJob({ name: "test_reqid" }, async () => {
      seenInBody = requestContext.getRequestId();
    });
    const runs = await runsFor("test_reqid");
    expect(runs[0].requestId).toBeTruthy();
    expect(seenInBody).toBe(runs[0].requestId); // the body's log lines would carry the same id

    // an explicit requestId is honoured
    await runJob({ name: "test_reqid2", requestId: "trace-job-9" }, async () => {});
    const runs2 = await runsFor("test_reqid2");
    expect(runs2[0].requestId).toBe("trace-job-9");
  });

  it("exits cleanly (lease_held) without running the body when another worker holds the lease", async () => {
    await acquireLease("test_held", "other-worker", 60_000); // live lease owned by someone else

    let ran = 0;
    const { skipped } = await runJob({ name: "test_held" }, async () => {
      ran += 1;
    });

    expect(skipped).toBe(true);
    expect(ran).toBe(0);
    const runs = await runsFor("test_held");
    expect(runs).toHaveLength(1);
    expect(runs[0].outcome).toBe("lease_held");

    await releaseLease("test_held", "other-worker");
  });

  it("records an error JobRun, re-throws, and still releases the lease", async () => {
    await expect(
      runJob({ name: "test_err" }, async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    const runs = await runsFor("test_err");
    expect(runs[0].outcome).toBe("error");
    expect(runs[0].error).toContain("boom");
    expect(runs[0].errors).toBe(1);
    expect(await lease("test_err")).toBeNull(); // released despite the throw
  });

  it("re-acquires a lease whose holder expired", async () => {
    await acquireLease("test_expired", "dead-worker", -1000); // already expired
    let ran = 0;
    const { skipped } = await runJob({ name: "test_expired" }, async () => {
      ran += 1;
    });
    expect(skipped).toBe(false);
    expect(ran).toBe(1);
  });

  it("serialises two concurrent runs of the same job — exactly one body executes", async () => {
    let ran = 0;
    const body = async () => {
      await sleep(40);
      ran += 1;
    };
    const results = await Promise.all([
      runJob({ name: "test_concurrent" }, body),
      runJob({ name: "test_concurrent" }, body),
    ]);

    expect(ran).toBe(1);
    const skips = results.filter((r) => r.skipped).length;
    expect(skips).toBe(1);
    const runs = await runsFor("test_concurrent");
    expect(runs.filter((r) => r.outcome === "success")).toHaveLength(1);
    expect(runs.filter((r) => r.outcome === "lease_held")).toHaveLength(1);
  });

  it("uses a distinct lease key so per-entity jobs don't block each other", async () => {
    let ran = 0;
    const results = await Promise.all([
      runJob({ name: "data_export", leaseName: "data_export:userA" }, async () => { ran += 1; }),
      runJob({ name: "data_export", leaseName: "data_export:userB" }, async () => { ran += 1; }),
    ]);
    expect(ran).toBe(2);
    expect(results.every((r) => !r.skipped)).toBe(true);
    // Both JobRuns aggregate under the jobType name.
    expect(await runsFor("data_export")).toHaveLength(2);
  });
});

describe("lambda handler → jobRunner", () => {
  it("routes a known jobType through the runner and records a JobRun", async () => {
    const res = await handler({ jobType: "fx_refresh" });
    expect(res.statusCode).toBe(200);
    expect(res.jobType).toBe("fx_refresh");
    expect(res.skipped).toBe(false);
    expect((await runsFor("fx_refresh")).some((r) => r.outcome === "success")).toBe(true);
  });

  it("throws on an unknown jobType", async () => {
    await expect(handler({ jobType: "does_not_exist" })).rejects.toThrow(/Unknown job type/);
  });
});

describe("GET /admin/jobs", () => {
  beforeEach(() => asGuest()); // dev-admin fallback in test

  it("returns recent runs, per-job health, and held leases", async () => {
    await runJob({ name: "health_ok" }, async () => {});
    await acquireLease("health_locked", "w1", 60_000);

    const res = await request(app).get("/api/v1/admin/jobs");
    expect(res.status).toBe(200);
    expect(res.body.runs.some((r) => r.name === "health_ok" && r.outcome === "success")).toBe(true);
    expect(res.body.health.some((h) => h.name === "health_ok" && h.lastSuccess)).toBe(true);
    expect(res.body.leases.some((l) => l.name === "health_locked")).toBe(true);

    await releaseLease("health_locked", "w1");
  });
});
