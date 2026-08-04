// api/webhooks.js — Clerk (svix), Stripe, and affiliate-postback webhook handlers.
const { Webhook } = require("svix");
const prisma = require("../config/database");
const env = require("../config/env");
const { writeBooking } = require("../utils/bookingWriter");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { logger } = require("../utils/logger");

async function clerkWebhook(req, res) {
  if (!env.CLERK_WEBHOOK_SECRET) {
    return res.status(500).json({ error: "Webhook secret not configured" });
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
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  try {
    if (evt.type === "user.created") {
      const email =
        evt.data.email_addresses?.[0]?.email_address || `${evt.data.id}@users.bonza.app`;
      const name = [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || null;
      await prisma.user.upsert({
        where: { id: evt.data.id },
        update: {},
        create: { id: evt.data.id, email, name },
      });
    }

    if (evt.type === "user.deleted") {
      await prisma.user.delete({ where: { id: evt.data.id } }).catch(() => {});
    }
  } catch {
  }

  res.json({ received: true });
}

async function affiliateWebhook(req, res) {
  try {
    const { network, clickRef, bookingValue, commission, status } = req.body || {};
    if (status !== "confirmed") return res.json({ received: true }); // ignore pending/declined

    const click = clickRef ? await prisma.affiliateClick.findUnique({ where: { id: clickRef } }) : null;
    if (!click) return res.json({ received: true });

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

    res.json({ received: true });
  } catch (err) {
    logger.error("[affiliateWebhook] processing failed", err);
    res.json({ received: true });
  }
}

module.exports = { clerkWebhook, affiliateWebhook };
