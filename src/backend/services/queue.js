// services/queue.js — Phase 27 §27g. The one queue abstraction. A producer calls enqueue(queue, message);
// a consumer function processes it. The point is to move slow, retriable side effects (sending email, building
// a data export, deleting an analytics person) off the request path and behind a DLQ — WITHOUT breaking
// offline-by-default: with no SQS URL configured, enqueue runs the consumer INLINE (same behaviour as before,
// just synchronous), so dev and tests need no AWS. With a URL, enqueue hands the message to SQS and the
// §27g consumer Lambda (lambda/queueConsumer.js) runs it, with a DLQ after 3 failed receives.
//
// At-most-once: every message carries a stable dedupe `key` (minted here if the caller doesn't pass one, and
// carried in the SQS body so a redelivery keeps it). consume() inserts (queue,key) first and skips on a
// conflict; if the handler throws it deletes the row so SQS can legitimately retry (→ DLQ after 3).
const crypto = require("node:crypto");
const env = require("../config/env");
const prisma = require("../config/database");
const { logger } = require("../utils/logger");
const requestContext = require("../utils/requestContext");

const QUEUES = {
  EMAIL: "email",
  DATA_EXPORT: "data_export",
  PERSON_DELETE: "person_delete",
  STATEMENT_PARSE: "statement_parse", // reserved — the interactive parse stays synchronous (see §27g notes)
  OG_IMAGE: "og_image", // reserved — no producer yet
};

// Consumers are looked up lazily (require inside the fn) so queue.js has no load-time dependency on the
// producer services — no require cycle (emailService → queue.js → emailService would otherwise loop).
const CONSUMERS = {
  email: (m) => require("./emailService").sendEmail(m),
  data_export: (m) => require("../jobs/exportJob").deliverExport(m.userId),
  person_delete: (m) => require("./analyticsDelete").deletePerson(m),
  statement_parse: (m) => require("./balanceSync").syncOneProgramme(m.userId, m.programme, { items: 0, externalCalls: 0, errors: 0, renew: () => {} }),
  og_image: () => Promise.resolve({ skipped: "og_image not implemented" }),
};

let _sqs = null;
function sqsClient() {
  if (!_sqs) {
    const { SQSClient } = require("@aws-sdk/client-sqs");
    _sqs = new SQSClient({ region: env.AWS_REGION });
  }
  return _sqs;
}

// Put a message on the queue. Offline (no URL) ⇒ run the consumer inline and return its result, so callers that
// read the result (e.g. the DSAR export) still work in dev. Online ⇒ SQS SendMessage and return { enqueued }.
async function enqueue(queue, message, { key } = {}) {
  const dedupeKey = key || crypto.randomUUID();
  const url = env.QUEUE_URLS[queue];

  if (env.hasSqs && url) {
    const { SendMessageCommand } = require("@aws-sdk/client-sqs");
    const body = JSON.stringify({ queue, message, key: dedupeKey, requestId: requestContext.getRequestId() || null });
    await sqsClient().send(new SendMessageCommand({ QueueUrl: url, MessageBody: body }));
    return { enqueued: true };
  }

  const result = await consume({ queue, message, key: dedupeKey });
  return { inline: true, ...result };
}

// Process one message with at-most-once semantics. Called inline by enqueue (offline) and by the consumer
// Lambda (online). Returns { processed, result } | { skipped, duplicate } and rethrows a handler error so SQS
// retries (the dedupe row is rolled back first).
async function consume({ queue, message, key }) {
  const handler = CONSUMERS[queue];
  if (!handler) {
    logger.warn(`[queue] no consumer registered for '${queue}'`);
    return { skipped: true, reason: "no_consumer" };
  }

  if (key) {
    try {
      await prisma.processedMessage.create({ data: { queue, key } });
    } catch (err) {
      if (err.code === "P2002") return { skipped: true, duplicate: true };
      throw err;
    }
  }

  try {
    const result = await handler(message);
    return { processed: true, result };
  } catch (err) {
    // Roll back the dedupe marker so a legitimate retry (SQS redelivery) can run again.
    if (key) await prisma.processedMessage.deleteMany({ where: { queue, key } }).catch(() => {});
    logger.error(`[queue] consumer '${queue}' failed`, err);
    throw err;
  }
}

module.exports = { QUEUES, enqueue, consume, CONSUMERS };
