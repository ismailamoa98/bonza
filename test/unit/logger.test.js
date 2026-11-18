// test/unit/logger.test.js — Phase 27 §27i. The pino logger's two guarantees: the mixin stamps the
// correlation id/userId from the request context onto every line, and the redact list scrubs secrets/PII.
// We build a pino from the logger's REAL options (logger._pinoOptions) against a capture stream, so we test
// the actual config without duplicating it or fighting pino's default fd-1 destination (silent in tests).
import { describe, it, expect } from "vitest";
import pino from "pino";

const requestContext = require("../../src/backend/utils/requestContext");
const { logger } = require("../../src/backend/utils/logger");

function capture() {
  const lines = [];
  const stream = { write: (s) => lines.push(JSON.parse(s)) };
  // force level active regardless of NODE_ENV=test (the real instance is silent in tests)
  const l = pino({ ...logger._pinoOptions, level: "info" }, stream);
  return { l, lines };
}

describe("logger (pino) — mixin + redaction", () => {
  it("omits request_id outside a context and stamps it inside", async () => {
    const { l, lines } = capture();
    l.info({ ok: 1 }, "outside");
    expect(lines[0].request_id).toBeUndefined();

    await requestContext.run({ requestId: "req-xyz" }, async () => {
      requestContext.set("userId", "user_42");
      l.info({ ok: 1 }, "inside");
    });
    expect(lines[1].request_id).toBe("req-xyz");
    expect(lines[1].userId).toBe("user_42");
  });

  it("redacts secrets and PII at the top level and one level deep", () => {
    const { l, lines } = capture();
    l.info(
      {
        authorization: "Bearer abc",
        email: "a@b.com",
        balance: 123456,
        accountNumber: "XY-9988",
        nested: { password: "hunter2", token: "t0ken" },
        keep: "visible",
      },
      "sensitive",
    );
    const line = lines[0];
    expect(line.authorization).toBe("[redacted]");
    expect(line.email).toBe("[redacted]");
    expect(line.balance).toBe("[redacted]");
    expect(line.accountNumber).toBe("[redacted]");
    expect(line.nested.password).toBe("[redacted]");
    expect(line.nested.token).toBe("[redacted]");
    expect(line.keep).toBe("visible"); // non-sensitive fields pass through
  });
});
