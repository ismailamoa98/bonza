// lambda/queueConsumer.js — Phase 27 §27g. The SQS consumer Lambda entry. One function fronts every §27g
// queue (each queue is an event source); the message body carries its logical `queue` so we dispatch to the
// right consumer via the shared queue abstraction (same code path as the offline inline consume()).
//
// Partial-batch failures are reported (reportBatchItemFailures on the event source): a record whose handler
// throws is returned in batchItemFailures so only it is retried/DLQ'd, not the whole batch.
const { consume } = require("../services/queue");
const requestContext = require("../utils/requestContext");
const { logger } = require("../utils/logger");

exports.handler = async (event) => {
  const records = (event && event.Records) || [];
  const batchItemFailures = [];

  for (const record of records) {
    let parsed;
    try {
      parsed = JSON.parse(record.body);
    } catch {
      logger.error("[queueConsumer] unparseable message body — sending to DLQ", null, { messageId: record.messageId });
      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }

    const { queue, message, key, requestId } = parsed;
    try {
      // §27i — run inside a correlation context seeded from the producer's request id (or the SQS message id).
      await requestContext.run({ requestId: requestId || record.messageId }, () => consume({ queue, message, key }));
    } catch (err) {
      logger.error(`[queueConsumer] ${queue} message failed`, err, { messageId: record.messageId });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
