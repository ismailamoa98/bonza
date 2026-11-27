// utils/webhookIdempotency.js — Phase 27 §27a. Inbound webhooks (Stripe/Clerk/Duffel/affiliate) redeliver, and
// SQS/at-least-once consumers replay. `oncePerEvent` inserts a ProcessedWebhook row keyed on (provider,eventId)
// and lets the unique-constraint violation be the duplicate signal, so the effect runs exactly once. On a
// duplicate it returns `{ duplicate: true }` — the caller returns 200 (a 4xx makes Stripe retry harder). If the
// effect throws, the marker is removed so a genuine redelivery can retry.
const prisma = require("../config/database");

async function oncePerEvent({ provider, eventId }, effect) {
  if (!eventId) return { duplicate: false, result: await effect() }; // no id to dedupe on — run once

  let row;
  try {
    row = await prisma.processedWebhook.create({ data: { provider, eventId, outcome: "applied" } });
  } catch (err) {
    if (err.code === "P2002") return { duplicate: true };
    throw err;
  }

  try {
    const result = await effect();
    return { duplicate: false, result };
  } catch (err) {
    // Let a redelivery reprocess: drop the marker (ProcessedWebhook is not in the append-only set).
    await prisma.processedWebhook.delete({ where: { id: row.id } }).catch(() => {});
    throw err;
  }
}

module.exports = { oncePerEvent };
