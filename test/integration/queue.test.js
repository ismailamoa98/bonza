// test/integration/queue.test.js — Phase 27 §27g. The queue abstraction + consumer. Offline (no SQS URL),
// enqueue runs the consumer inline so dev/tests are unchanged; at-most-once via a (queue,key) dedupe marker
// that rolls back on a handler error so SQS can retry; the consumer Lambda dispatches by the message's queue.
import { describe, it, expect } from "vitest";
import { makeUser, prisma } from "../factories/index.js";

const { enqueue, consume, QUEUES, CONSUMERS } = require("../../src/backend/services/queue");
const { createAndSend } = require("../../src/backend/services/emailService");
const { handler: queueConsumer } = require("../../src/backend/lambda/queueConsumer");

const processed = (queue) => prisma.processedMessage.findMany({ where: { queue } });

describe("queue abstraction (§27g)", () => {
  it("enqueue runs the consumer inline offline and records a dedupe marker", async () => {
    const res = await enqueue(QUEUES.PERSON_DELETE, { userId: "u-1" }, { key: "person_delete:u-1" });
    expect(res.inline).toBe(true);
    expect(res.processed).toBe(true);
    expect(res.result.mock).toBe(true); // analyticsDelete is a no-op offline
    const rows = await processed(QUEUES.PERSON_DELETE);
    expect(rows.map((r) => r.key)).toContain("person_delete:u-1");
  });

  it("is idempotent — the same key is processed at most once", async () => {
    let runs = 0;
    CONSUMERS.__test_once = () => { runs += 1; return "ok"; };
    try {
      await consume({ queue: "__test_once", message: {}, key: "k1" });
      const dup = await consume({ queue: "__test_once", message: {}, key: "k1" });
      expect(dup.duplicate).toBe(true);
      expect(runs).toBe(1);
    } finally {
      delete CONSUMERS.__test_once;
    }
  });

  it("rolls back the dedupe marker when the handler throws, so a retry can run", async () => {
    CONSUMERS.__test_fail = () => { throw new Error("boom"); };
    try {
      await expect(consume({ queue: "__test_fail", message: {}, key: "kf" })).rejects.toThrow("boom");
      expect(await prisma.processedMessage.findMany({ where: { queue: "__test_fail", key: "kf" } })).toHaveLength(0);
    } finally {
      delete CONSUMERS.__test_fail;
    }
  });

  it("createAndSend writes the Notification and enqueues the email (deduped on the notification id)", async () => {
    const user = await makeUser();
    const notification = await createAndSend({
      userId: user.id,
      type: "booking_confirmed",
      title: "Booked",
      body: "Your trip is booked",
      userEmail: user.email,
      emailSubject: "Booked",
      emailHtml: "<p>Booked</p>",
    });
    expect(notification).toBeTruthy();
    const rows = await processed(QUEUES.EMAIL);
    expect(rows.map((r) => r.key)).toContain(notification.id);
  });

  it("data export still delivers inline (returns the offline mode)", async () => {
    const user = await makeUser();
    const out = await enqueue(QUEUES.DATA_EXPORT, { userId: user.id }, { key: `export:${user.id}:1` });
    expect(out.result.mode).toBe("local"); // deliverExport ran inline
  });
});

describe("queue consumer Lambda (§27g)", () => {
  it("dispatches an SQS record to its queue's consumer and reports no failures", async () => {
    const event = {
      Records: [
        { messageId: "m1", body: JSON.stringify({ queue: QUEUES.PERSON_DELETE, message: { userId: "u-9" }, key: "person_delete:u-9" }) },
      ],
    };
    const res = await queueConsumer(event);
    expect(res.batchItemFailures).toEqual([]);
    expect((await processed(QUEUES.PERSON_DELETE)).map((r) => r.key)).toContain("person_delete:u-9");
  });

  it("reports a failed record as a batch item failure (→ redrive/DLQ)", async () => {
    CONSUMERS.__test_fail2 = () => { throw new Error("nope"); };
    try {
      const event = { Records: [{ messageId: "bad", body: JSON.stringify({ queue: "__test_fail2", message: {}, key: "x" }) }] };
      const res = await queueConsumer(event);
      expect(res.batchItemFailures).toEqual([{ itemIdentifier: "bad" }]);
    } finally {
      delete CONSUMERS.__test_fail2;
    }
  });

  it("reports an unparseable body as a batch item failure", async () => {
    const res = await queueConsumer({ Records: [{ messageId: "junk", body: "{not json" }] });
    expect(res.batchItemFailures).toEqual([{ itemIdentifier: "junk" }]);
  });
});
