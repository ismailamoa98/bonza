// services/emailService.js — createAndSend: always writes the Notification row, emails only if opted-in + hasEmailSend.
const env = require("../config/env");
const prisma = require("../config/database");
const { logger } = require("../utils/logger");

let _resend = null;
function getResend() {
  if (!_resend) {
    const { Resend } = require("resend");
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}

const TRANSACTIONAL = new Set([
  "booking_confirmed",
  "credits_awarded",
  "pro_activated",
  "pro_expiring",
]);

const PREF_FOR_TYPE = {
  award_availability: "awardAlerts",
  expiry_warning: "expiryWarnings",
  price_drop: "priceDropAlerts",
  monthly_summary: "monthlySummary",
};

async function sendEmail({ to, subject, html, notificationId }) {
  if (!to || !subject || !html) return { sent: false, error: "missing to/subject/html" };

  if (!env.hasEmailSend) {
    logger.info(`[emailService] MOCK send → ${to} · "${subject}" (set RESEND_API_KEY to send live)`);
    return { sent: false, mock: true };
  }

  try {
    const { data, error } = await getResend().emails.send({ from: env.EMAIL_FROM, to, subject, html });
    if (error) {
      logger.error("[emailService] Resend error", error);
      return { sent: false, error };
    }
    if (notificationId) {
      await prisma.notification
        .update({ where: { id: notificationId }, data: { emailSentAt: new Date() } })
        .catch(() => {});
    }
    return { sent: true, resendId: data?.id };
  } catch (err) {
    logger.error("[emailService] send failed", err);
    return { sent: false, error: err.message };
  }
}

async function userWantsEmail(userId, type) {
  if (TRANSACTIONAL.has(type)) return true;
  const flag = PREF_FOR_TYPE[type];
  if (!flag) return true; // unknown type — default to sending
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId } }).catch(() => null);
  if (!prefs) return true;
  return prefs[flag] !== false;
}

async function createAndSend({
  userId,
  type,
  title,
  body,
  ctaLabel,
  ctaUrl,
  bookingId,
  journeyId,
  programme,
  expiresAt,
  emailSubject,
  emailHtml,
  userEmail,
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
        bookingId: bookingId || null,
        journeyId: journeyId || null,
        programme: programme || null,
        expiresAt: expiresAt || null,
      },
    });

    if (userEmail && emailSubject && emailHtml && (await userWantsEmail(userId, type))) {
      await sendEmail({ to: userEmail, subject: emailSubject, html: emailHtml, notificationId: notification.id });
    }

    return notification;
  } catch (err) {
    logger.error(`[emailService] createAndSend failed (${type})`, err);
    return null;
  }
}

module.exports = { sendEmail, userWantsEmail, createAndSend };
