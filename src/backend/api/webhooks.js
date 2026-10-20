// api/webhooks.js — Clerk (svix), Stripe, and affiliate-postback webhook handlers.
const { Webhook } = require("svix");
const prisma = require("../config/database");
const env = require("../config/env");
const { sendError } = require("../utils/AppError");
const { writeBooking } = require("../utils/bookingWriter");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { recordSignupAcceptance } = require("../services/legalAcceptance");
const { oncePerEvent } = require("../utils/webhookIdempotency");
const { logger } = require("../utils/logger");

async function clerkWebhook(req, res) {
  if (!env.CLERK_WEBHOOK_SECRET) {
    return sendError(res, "INTERNAL", { message: "Webhook secret not configured" });
  }

  let evt;
  try {
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
    const payload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
    evt = wh.verify(payload, {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });
  } catch {
    return sendError(res, "VALIDATION_FAILED", { message: "Invalid webhook signature" });
  }

  try {
    // §27a — dedupe on the svix message id, which is stable across Clerk redeliveries.
    await oncePerEvent({ provider: "clerk", eventId: req.headers["svix-id"] }, async () => {
      if (evt.type === "user.created") {
        const email =
          evt.data.email_addresses?.[0]?.email_address || `${evt.data.id}@users.bonza.app`;
        const name = [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || null;
        await prisma.user.upsert({
          where: { id: evt.data.id },
          update: {},
          create: { id: evt.data.id, email, name },
        });
        // Phase 25 §25d — record signup acceptance of terms + privacy (idempotent; server-side, so no browser
        // IP/UA — the JIT ensureUser path captures those on the user's first authenticated request).
        await recordSignupAcceptance(evt.data.id, null).catch(() => {});
      }

      if (evt.type === "user.deleted") {
        await prisma.user.delete({ where: { id: evt.data.id } }).catch(() => {});
      }
    });
  } catch {
  }

  res.json({ received: true });
}

async function affiliateWebhook(req, res) {
  try {
    const { network, clickRef, bookingValue, commission, status } = req.body || {};
    if (status !== "confirmed") return res.json({ received: true }); // ignore pending/declined

    // §27a — one conversion per click; a redelivered postback for the same clickRef is a no-op.
    await oncePerEvent({ provider: "affiliate", eventId: clickRef }, async () => {
      const click = clickRef ? await prisma.affiliateClick.findUnique({ where: { id: clickRef } }) : null;
      if (!click) return;

      await prisma.affiliateClick.update({
        where: { id: click.id },
        data: {
          convertedAt: new Date(),
          commissionEst: commission != null ? parseFloat(commission) : click.commissionEst,
        },
      });

      if (click.userId) {
        const journey = await prisma.userJourney.findFirst({
          where: { userId: click.userId, bookingConfirmed: false },
          orderBy: { createdAt: "desc" },
        });

        await writeBooking(click.userId, {
          journeyId: journey?.id || null,
          tripId: journey?.tripId || null,
          origin: journey?.origin || null,
          destination: journey?.destination || null,
          leg: click.leg,
          bookingType: "cash",
          supplier: network || click.programme,
          description: journey?.destination ? `Booking — ${journey.destination}` : "Affiliate booking",
          cashValueGbp: bookingValue != null ? parseFloat(bookingValue) : null,
          confirmationMethod: "affiliate_postback",
        });

        recordEvent(click.userId, EVENT_TYPES.BOOKING_CONFIRMED, {
          network,
          bookingValue,
          commission,
          method: "affiliate_postback",
          clickRef,
        });
      }
    });

    res.json({ received: true });
  } catch (err) {
    logger.error("[affiliateWebhook] processing failed", err);
    res.json({ received: true });
  }
}

module.exports = { clerkWebhook, affiliateWebhook };
