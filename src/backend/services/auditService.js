// services/auditService.js — Phase 27 §27k. The one writer for the append-only AuditEvent trail. Every
// trust-sensitive mutation (money, balances, bookings, consent, plan, account lifecycle) records who did it,
// to whom, when, from where (§25d ipHash), and from→to (changed fields only) — with the §27i correlation id.
//
// Provenance (actorId / requestId / ipHash) is read from the §27i request context by default, so services
// don't thread `req`. Pass a `tx` to write the audit row INSIDE the mutation's transaction (atomic — used by
// the §27a serializable credits + FOR UPDATE balance paths); without a tx it's best-effort on the main client
// and never throws into the caller (an audit hiccup must not fail a booking).
const prisma = require("../config/database");
const { logger } = require("../utils/logger");
const requestContext = require("../utils/requestContext");

// The dotted action vocabulary (documentation + a single source of truth for callers).
const ACTIONS = {
  BALANCE_STATEMENT_APPLIED: "balance.statement_applied",
  BALANCE_MANUAL_OVERRIDE: "balance.manual_override",
  BALANCE_QUARANTINED: "balance.quarantined",
  BALANCE_QUARANTINE_RESOLVED: "balance.quarantine_resolved",
  CREDIT_AWARDED: "credit.awarded",
  CREDIT_REDEEMED: "credit.redeemed",
  CREDIT_REVERSED: "credit.reversed",
  BOOKING_CREATED: "booking.created",
  BOOKING_CANCELLED: "booking.cancelled",
  PLAN_UPGRADED: "plan.upgraded",
  PLAN_CANCELLED: "plan.cancelled",
  PLAN_CHANGED: "plan.changed",
  CONSENT_ACCEPTED: "consent.accepted",
  ACCOUNT_DELETE_REQUESTED: "account.delete_requested",
  ACCOUNT_DELETE_CANCELLED: "account.delete_cancelled",
  ACCOUNT_HARD_DELETED: "account.hard_deleted",
  DATA_EXPORT_REQUESTED: "data.export_requested",
  ADMIN_VIEWED_ACCOUNT: "admin.viewed_account",
  ADMIN_VIEWED_AUDIT: "admin.viewed_audit",
};

// Build the audit row, filling actor/request/ip from the §27i context unless explicitly provided.
function buildRow({ action, subjectUserId = null, entity = null, entityId = null, before = null, after = null, actorType, actorId, source = null }) {
  const ctx = requestContext.get() || {};
  const resolvedActorId = actorId !== undefined ? actorId : ctx.userId ?? null;
  const resolvedActorType = actorType || (resolvedActorId ? "user" : "system");
  return {
    actorType: resolvedActorType,
    actorId: resolvedActorId,
    subjectUserId,
    action,
    entity,
    entityId,
    before: before ?? undefined,
    after: after ?? undefined,
    requestId: ctx.requestId ?? null,
    ipHash: ctx.ipHash ?? null,
    source,
  };
}

// Record one audit event. With `tx` the write is part of the caller's transaction (atomic, and a failure
// rolls the whole thing back — intended for the money/balance paths). Without `tx` it's best-effort.
async function recordAudit(input, { tx } = {}) {
  const data = buildRow(input);
  if (tx) return tx.auditEvent.create({ data });
  try {
    return await prisma.auditEvent.create({ data });
  } catch (err) {
    logger.error(`[auditService] failed to record ${input.action}`, err);
    return null;
  }
}

module.exports = { recordAudit, ACTIONS };
