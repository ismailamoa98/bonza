// api/notifications.js — in-app notification list/read/dismiss + preferences + public unsubscribe.
const express = require("express");
const { logger } = require("../utils/logger");
const prisma = require("../config/database");
const { ownedOr403 } = require("../utils/ownedOr403");

const router = express.Router();

const PREF_FIELDS = [
  "awardAlerts",
  "expiryWarnings",
  "priceDropAlerts",
  "monthlySummary",
  "bookingUpdates",
  "proUpdates",
];

const UNSUB_MAP = {
  award_availability: { awardAlerts: false },
  expiry_warning: { expiryWarnings: false },
  price_drop: { priceDropAlerts: false },
  monthly_summary: { monthlySummary: false },
};

router.get("/", async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.userId,
        dismissedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const unreadCount = notifications.filter((n) => !n.readAt).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

router.post("/read-all", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/dismiss", async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!ownedOr403(notification, req.userId, res)) return;
    await prisma.notification.update({ where: { id: notification.id }, data: { dismissedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/preferences", async (req, res, next) => {
  try {
    const prefs = await prisma.notificationPreference.findUnique({ where: { userId: req.userId } });
    res.json({ preferences: prefs || {} });
  } catch (err) {
    next(err);
  }
});

router.put("/preferences", async (req, res, next) => {
  try {
    const data = {};
    for (const f of PREF_FIELDS) if (typeof req.body?.[f] === "boolean") data[f] = req.body[f];

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: req.userId },
      update: data,
      create: { userId: req.userId, ...data },
    });
    res.json({ preferences: prefs });
  } catch (err) {
    next(err);
  }
});

async function unsubscribe(req, res) {
  const { type, uid } = req.query;
  if (!uid || !type || !UNSUB_MAP[type]) {
    return res.status(400).send("Invalid unsubscribe link.");
  }
  try {
    await prisma.notificationPreference.upsert({
      where: { userId: uid },
      update: UNSUB_MAP[type],
      create: { userId: uid, ...UNSUB_MAP[type] },
    });
  } catch (err) {
    logger.error("[notifications] unsubscribe upsert failed", err);
  }
  const pretty = String(type).replace(/_/g, " ");
  res.set("Content-Type", "text/html").send(
    `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:64px 20px;background:#F4F3EE;color:#2a2420;">
      <h1 style="font-family:Georgia,serif;font-weight:600;">Unsubscribed</h1>
      <p style="color:#6a6258;">You've been unsubscribed from ${pretty} emails.</p>
      <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard" style="color:#da7756;font-weight:600;text-decoration:none;">Back to Bonza →</a>
    </body></html>`
  );
}

module.exports = { router, unsubscribe };
