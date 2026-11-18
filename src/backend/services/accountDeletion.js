// services/accountDeletion.js — Phase 25 §25e. The account-deletion lifecycle: a 14-day soft-delete (account
// locked immediately, email-sync tokens revoked at once, Pro cancelled at period end, confirmation email with
// an Undo link), an Undo, a status read, and the hard-delete cascade that runs after 14 days.
//
// Hard delete is FK-safe and compliant: PII-bearing child rows are deleted; the financial record (Booking,
// BonzaCredit) and the product-event log (UserEvent) are RETAINED for 7 years but de-identified by
// pseudonymising the User row in place (scrub personal fields, park the email) rather than deleting it — which
// keeps those retained rows' foreign keys valid without a schema migration. The Clerk login is deleted so the
// person can no longer sign in. See src/frontend/.../legal/privacy (financial-record retention, Art 17(3)(b)).
const crypto = require("crypto");
const prisma = require("../config/database");
const env = require("../config/env");
const { logger } = require("../utils/logger");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { recordAudit, ACTIONS } = require("./auditService");
const { createAndSend } = require("./emailService");

const SOFT_DELETE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const hardDeleteDate = (deletedAt) => new Date(new Date(deletedAt).getTime() + SOFT_DELETE_DAYS * DAY_MS);

// --- Soft delete (start) ---------------------------------------------------
async function startDeletion(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  if (user.deletedAt) return { alreadyScheduled: true, deletedAt: user.deletedAt, hardDeleteAt: hardDeleteDate(user.deletedAt) };

  const now = new Date();
  // Lock the account and revoke email-sync access immediately (before anything else).
  await prisma.user.update({
    where: { id: userId },
    data: {
      lockedAt: now,
      deletedAt: now,
      gmailConnected: false,
      gmailRefreshToken: null,
      outlookConnected: false,
      outlookRefreshToken: null,
    },
  });

  // §27e-9 — capture the Stripe customer mapping BEFORE the subscription row is removed at hard-delete, so a
  // stray invoice after deletion is still traceable; the user id is hashed (never stored raw).
  try {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    const userHash = crypto.createHash("sha256").update(`${userId}${env.APP_SALT}`).digest("hex");
    await prisma.deletedCustomer.upsert({
      where: { userHash },
      update: { stripeCustomerId: sub?.stripeCustomerId || null },
      create: { userHash, stripeCustomerId: sub?.stripeCustomerId || null, note: "delete requested" },
    });
  } catch (err) {
    logger.error("[accountDeletion] DeletedCustomer mapping failed", err);
  }

  // Cancel Pro immediately (§27e-9) — best-effort; never block the deletion on a billing hiccup.
  try {
    const { cancelSubscription } = require("./stripeService");
    await cancelSubscription(userId);
  } catch (err) {
    logger.error("[accountDeletion] Pro cancel on delete failed", err);
  }

  await recordEvent(userId, EVENT_TYPES.ACCOUNT_DELETE_REQUESTED, { hardDeleteAt: hardDeleteDate(now) }).catch(() => {});
  await recordAudit({ action: ACTIONS.ACCOUNT_DELETE_REQUESTED, subjectUserId: userId, entity: "User", entityId: userId, after: { deletedAt: now, hardDeleteAt: hardDeleteDate(now) } });

  const undoUrl = `${env.FRONTEND_URL}/settings?undo-delete=1`;
  await createAndSend({
    userId,
    type: "account_deletion_scheduled",
    title: "Your account is scheduled for deletion",
    body: `Your Bonza account will be permanently deleted in ${SOFT_DELETE_DAYS} days. Changed your mind? You can undo this any time before then.`,
    ctaLabel: "Undo deletion",
    ctaUrl: undoUrl,
    userEmail: user.email,
    emailSubject: "Your Bonza account is scheduled for deletion",
    emailHtml: `<p>Your Bonza account will be permanently deleted on <strong>${hardDeleteDate(now).toDateString()}</strong>.</p><p>If this was a mistake, <a href="${undoUrl}">undo the deletion</a> any time before then.</p><p>Note: completed booking and credit records are kept for 7 years for UK tax law, with your personal details removed.</p>`,
  }).catch(() => {});

  return { deletedAt: now, hardDeleteAt: hardDeleteDate(now) };
}

// --- Undo ------------------------------------------------------------------
async function cancelDeletion(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.deletedAt) return { restored: false };

  await prisma.user.update({ where: { id: userId }, data: { lockedAt: null, deletedAt: null } });
  await recordEvent(userId, EVENT_TYPES.ACCOUNT_DELETE_CANCELLED, {}).catch(() => {});
  await recordAudit({ action: ACTIONS.ACCOUNT_DELETE_CANCELLED, subjectUserId: userId, entity: "User", entityId: userId });
  await createAndSend({
    userId,
    type: "account_deletion_cancelled",
    title: "Your account deletion was cancelled",
    body: "Welcome back — your account is active again and nothing was deleted.",
    userEmail: user.email,
    emailSubject: "Your Bonza account deletion was cancelled",
    emailHtml: "<p>Your account deletion has been cancelled. Nothing was deleted and your account is active again.</p>",
  }).catch(() => {});
  return { restored: true };
}

// --- Status ----------------------------------------------------------------
async function deleteStatus(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { deletedAt: true, lockedAt: true } });
  if (!user?.deletedAt) return { scheduled: false };
  const hardAt = hardDeleteDate(user.deletedAt);
  const daysRemaining = Math.max(0, Math.ceil((hardAt.getTime() - Date.now()) / DAY_MS));
  return { scheduled: true, deletedAt: user.deletedAt, hardDeleteAt: hardAt, daysRemaining };
}

// --- Hard delete (cascade) -------------------------------------------------
async function hardDeleteUser(userId) {
  const pseudoEmail = `deleted_user_${crypto.createHash("sha256").update(`${userId}${env.APP_SALT}`).digest("hex").slice(0, 16)}@deleted.bonza.app`;

  // Delete PII-bearing child rows child→parent so no foreign key is left dangling.
  await prisma.$transaction([
    // Chat tree
    prisma.chatMessage.deleteMany({ where: { session: { userId } } }),
    prisma.chatSession.deleteMany({ where: { userId } }),
    // Booking-link tree
    prisma.conversion.deleteMany({ where: { bookingLink: { userId } } }),
    prisma.affiliateLink.deleteMany({ where: { bookingLink: { userId } } }),
    prisma.bookingLink.deleteMany({ where: { userId } }),
    // Trip tree
    prisma.scenario.deleteMany({ where: { trip: { userId } } }),
    prisma.trip.deleteMany({ where: { userId } }),
    // Detach retained bookings from journeys so journeys can go.
    prisma.booking.updateMany({ where: { userId }, data: { journeyId: null } }),
    prisma.userJourney.deleteMany({ where: { userId } }),
    // Directly user-scoped PII
    prisma.loyaltyAccount.deleteMany({ where: { userId } }),
    prisma.personalisedRecommendation.deleteMany({ where: { userId } }),
    prisma.propertyReview.deleteMany({ where: { userId } }),
    prisma.pointsActivity.deleteMany({ where: { userId } }),
    prisma.balanceSyncRun.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.notificationPreference.deleteMany({ where: { userId } }),
    prisma.affiliateClick.deleteMany({ where: { userId } }),
    prisma.subscription.deleteMany({ where: { userId } }),
    prisma.legalAcceptance.deleteMany({ where: { userId } }),
    prisma.supportTicket.deleteMany({ where: { userId } }), // SupportMessage cascades (schema onDelete)
    // Pseudonymise the User in place — retains Booking/BonzaCredit/UserEvent FKs; person no longer identifiable.
    prisma.user.update({
      where: { id: userId },
      data: {
        email: pseudoEmail,
        name: null,
        title: null,
        firstName: null,
        lastName: null,
        dateOfBirth: null,
        phone: null,
        passportNumber: null,
        homeAirport: null,
        travelStyle: null,
        gmailConnected: false,
        gmailRefreshToken: null,
        outlookConnected: false,
        outlookRefreshToken: null,
        consentAnalytics: false,
        consentMarketing: false,
      },
    }),
  ]);

  // External systems — env-gated, best-effort. Stripe customer is intentionally retained (HMRC record);
  // PostHog/Sentry person-deletes run client-side (posthog.reset on sign-out) — no server SDK is wired here.
  try {
    if (process.env.CLERK_SECRET_KEY) {
      const { clerkClient } = require("@clerk/express");
      await clerkClient.users.deleteUser(userId);
    }
  } catch (err) {
    logger.error("[accountDeletion] Clerk delete failed", err);
  }

  // §27k — the append-only audit row survives the hard-delete (no User FK), so there's a record the erasure ran.
  await recordAudit({ action: ACTIONS.ACCOUNT_HARD_DELETED, actorType: "system", subjectUserId: userId, entity: "User", entityId: userId });
  logger.info(`[accountDeletion] hard-deleted user ${userId} (financial records retained, pseudonymised)`);
  return { deleted: true };
}

// Batch: every account whose soft-delete window has elapsed. Returns counts for the retention/audit log.
async function runHardDeletes(now = new Date()) {
  const cutoff = new Date(now.getTime() - SOFT_DELETE_DAYS * DAY_MS);
  const due = await prisma.user.findMany({ where: { deletedAt: { not: null, lte: cutoff } }, select: { id: true } });
  let deleted = 0;
  for (const { id } of due) {
    try {
      await hardDeleteUser(id);
      deleted += 1;
    } catch (err) {
      logger.error(`[accountDeletion] hard delete failed for ${id}`, err);
    }
  }
  return { due: due.length, deleted };
}

module.exports = { SOFT_DELETE_DAYS, startDeletion, cancelDeletion, deleteStatus, hardDeleteUser, runHardDeletes };
