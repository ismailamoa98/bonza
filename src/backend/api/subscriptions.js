// api/subscriptions.js — Bonza Pro subscribe/cancel/status + Stripe webhook (mock unless env.hasStripe).
const express = require("express");
const prisma = require("../config/database");
const env = require("../config/env");
const { isProActive } = require("../middleware/requirePro");
const { createSubscription, cancelSubscription, handleWebhook } = require("../services/stripeService");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { triggerProActivated } = require("../services/notificationTriggers");

const router = express.Router();

router.post("/create", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    const result = await createSubscription(req.userId, user.email);
    recordEvent(req.userId, EVENT_TYPES.PRO_UPGRADED, { mock: !env.hasStripe });
    if (!env.hasStripe || result.mock) triggerProActivated(req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/cancel", async (req, res, next) => {
  try {
    const result = await cancelSubscription(req.userId);
    recordEvent(req.userId, EVENT_TYPES.PRO_CANCELLED, { mock: !env.hasStripe });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/status", async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId } });
    res.json({
      isPro: isProActive(sub),
      status: sub?.status || "free",
      plan: sub?.plan || "free",
      currentPeriodEnd: sub?.currentPeriodEnd || null,
    });
  } catch (err) {
    next(err);
  }
});

async function stripeWebhook(req, res) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: "Stripe webhook secret not configured" });
  }
  try {
    const result = await handleWebhook(req.body, req.headers["stripe-signature"]);
    if (result?.activatedUserId) triggerProActivated(result.activatedUserId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: `Webhook error: ${err.message}` });
  }
}

module.exports = router;
module.exports.stripeWebhook = stripeWebhook;
