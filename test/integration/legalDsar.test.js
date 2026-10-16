// test/integration/legalDsar.test.js — Phase 25 §25d/§25e. The /me legal-acceptance + DSAR surface. Per the
// harness, authed HTTP acts as the dev-fallback user (user_dev_demo), so we seed that row; direct service
// calls use their own makeUser. Export runs offline (no S3) → local mode, no link leaked to the client.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { makeUser, prisma } from "../factories/index.js";

const app = require("../../src/backend/server");
const { assembleExport } = require("../../src/backend/services/dataExport");

const DEV_ID = "user_dev_demo";

beforeEach(async () => {
  await makeUser({ id: DEV_ID, email: "demo@bonza.app" });
});

describe("§25d — legal acceptance", () => {
  it("records re-acceptance and reports it in history", async () => {
    const accept = await request(app).post("/api/v1/me/legal/accept").send({ documents: ["terms", "privacy"] });
    expect(accept.status).toBe(200);
    expect(accept.body.accepted).toEqual(expect.arrayContaining(["terms", "privacy"]));

    const hist = await request(app).get("/api/v1/me/legal");
    expect(hist.status).toBe(200);
    const docs = hist.body.acceptances.map((a) => a.document);
    expect(docs).toContain("terms");
    expect(docs).toContain("privacy");
    expect(hist.body.acceptances.every((a) => a.isCurrent)).toBe(true);
  });

  it("rejects an accept with no valid documents", async () => {
    const res = await request(app).post("/api/v1/me/legal/accept").send({ documents: ["not-a-doc"] });
    expect(res.status).toBe(400);
  });
});

describe("§25e — data export", () => {
  it("assembles every required file, excluding secrets", async () => {
    const user = await makeUser();
    const files = await assembleExport(user.id);
    for (const name of ["profile.json", "loyalty.csv", "bookings.csv", "credits.csv", "events.csv", "support.csv", "legal.csv", "README.txt"]) {
      expect(files[name]).toBeTypeOf("string");
    }
    expect(files["profile.json"]).not.toContain("RefreshToken");
  });

  it("POST /me/export returns offline mode and never leaks a local path", async () => {
    const res = await request(app).post("/api/v1/me/export");
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("local");
    expect(res.body.path).toBeUndefined();
  });

  it("rate-limits a second export within 24h", async () => {
    await request(app).post("/api/v1/me/export");
    const res = await request(app).post("/api/v1/me/export");
    expect(res.status).toBe(429);
  });
});

describe("§25e — account deletion lifecycle", () => {
  it("locks on delete, blocks mutations, and the undo restores access", async () => {
    // Give the dev user email-sync tokens to prove they're revoked.
    await prisma.user.update({ where: { id: DEV_ID }, data: { gmailConnected: true, gmailRefreshToken: "tok" } });

    const del = await request(app).post("/api/v1/me/delete");
    expect(del.status).toBe(200);
    expect(del.body.scheduled).toBe(true);

    const locked = await prisma.user.findUnique({ where: { id: DEV_ID } });
    expect(locked.deletedAt).not.toBeNull();
    expect(locked.gmailRefreshToken).toBeNull(); // email-sync tokens revoked immediately

    // A mutation is blocked while locked...
    const blocked = await request(app).post("/api/v1/me/legal/accept").send({ documents: ["terms"] });
    expect(blocked.status).toBe(423);

    // ...but the status + undo paths stay reachable.
    const status = await request(app).get("/api/v1/me/delete/status");
    expect(status.body.scheduled).toBe(true);
    expect(status.body.daysRemaining).toBeGreaterThan(0);

    const undo = await request(app).post("/api/v1/me/delete/cancel");
    expect(undo.status).toBe(200);
    expect(undo.body.restored).toBe(true);

    const restored = await prisma.user.findUnique({ where: { id: DEV_ID } });
    expect(restored.deletedAt).toBeNull();
  });
});
