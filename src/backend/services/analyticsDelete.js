// services/analyticsDelete.js — Phase 27 §27g. Server-side analytics person-delete on account erasure (§25e).
// Client-side we already call posthog.reset() on sign-out, but a GDPR erasure must remove the person from the
// analytics store too. This runs behind the person_delete queue. Env-gated: without a PostHog admin key it's a
// no-op log, so dev/tests stay offline (no network). PostHog deletes are async on their side; we fire the
// delete request and let their pipeline complete it.
const env = require("../config/env");
const { logger } = require("../utils/logger");

async function deletePerson({ userId, distinctId }) {
  const id = distinctId || userId;
  if (!id) return { skipped: true, reason: "no_id" };

  if (!env.hasPosthogAdmin) {
    logger.info(`[analyticsDelete] MOCK person-delete for ${id} (set POSTHOG_PERSONAL_API_KEY to action)`);
    return { skipped: true, mock: true };
  }

  // PostHog: POST /api/projects/:id/persons/:distinct_id/delete (personal API key auth).
  const url = `${env.POSTHOG_HOST}/api/projects/${env.POSTHOG_PROJECT_ID}/persons/${encodeURIComponent(id)}/delete/`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ delete_events: true }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`PostHog delete ${res.status}: ${body.slice(0, 200)}`);
    }
    logger.info(`[analyticsDelete] person-delete requested for ${id}`);
    return { deleted: true };
  } catch (err) {
    logger.error("[analyticsDelete] person-delete failed", err);
    throw err; // let the queue retry (→ DLQ after 3)
  }
}

module.exports = { deletePerson };
