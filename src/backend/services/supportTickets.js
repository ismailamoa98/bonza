// services/supportTickets.js — Phase 22. Create/append support tickets. On creation we set slaTarget from the
// urgency, snapshot contextJson (state at the time it was raised — snapshotted, not joined), write the first
// SupportMessage, and send a confirmation email (gated on hasEmailSend; logs offline). Escalations from the
// assistant funnel through createTicket too, carrying the transcript.
const prisma = require("../config/database");
const env = require("../config/env");
const { logger } = require("../utils/logger");
const { uniqueTicketRef } = require("../utils/ticketRef");
const { sendEmail } = require("./emailService");
const supportTicketEmail = require("../emails/supportTicket");

// SLA targets in hours, by urgency.
const SLA = { travelling_now: 1, booking_issue: 24, general: 48 };
const SLA_TEXT = {
  travelling_now: "within about 1 hour",
  booking_issue: "within 24 hours",
  general: "within 48 hours",
};

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

// Snapshot the state we'd want when reviewing this ticket weeks later.
async function snapshotContext(userId, userAgent) {
  if (!userId) return { userAgent: userAgent || null };
  try {
    const [accounts, credits, subscription, lastSync] = await Promise.all([
      prisma.loyaltyAccount.findMany({ where: { userId }, select: { programme: true, balance: true, syncState: true } }),
      prisma.bonzaCredit.aggregate({ where: { userId, expiresAt: { gt: new Date() } }, _sum: { amount: true } }),
      prisma.subscription.findUnique({ where: { userId }, select: { status: true, currentPeriodEnd: true } }),
      prisma.balanceSyncRun.findFirst({ where: { userId }, orderBy: { startedAt: "desc" }, select: { startedAt: true } }),
    ]);
    return {
      balances: accounts,
      creditBalance: credits._sum.amount ?? 0,
      pro: subscription?.status ?? null,
      lastSyncAt: lastSync?.startedAt ?? null,
      userAgent: userAgent || null,
      at: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn("Ticket context snapshot failed", { error: err.message });
    return { userAgent: userAgent || null };
  }
}

// createTicket({ userId, email, name, urgency, category, subject, message, bookingId, userAgent, transcript })
async function createTicket(input) {
  const urgency = SLA[input.urgency] ? input.urgency : "general";
  const reference = await uniqueTicketRef();
  const slaTarget = new Date(Date.now() + SLA[urgency] * 3600 * 1000);
  const contextJson = await snapshotContext(input.userId, input.userAgent);

  const ticket = await prisma.supportTicket.create({
    data: {
      reference,
      userId: input.userId || null,
      email: input.email,
      name: input.name || null,
      urgency,
      category: input.category || "general",
      subject: input.subject || "Support request",
      message: input.message || "",
      bookingId: input.bookingId || null,
      contextJson,
      slaTarget,
      messages: {
        create: [
          // An assistant transcript (on escalation) seeds the thread so the user never repeats themselves.
          ...(input.transcript || []).map((m) => ({ author: m.author, authorName: m.authorName || null, body: m.body })),
          { author: "user", authorName: input.name || null, body: input.message || "(no message)" },
        ],
      },
    },
  });

  // Confirmation email — transactional, sent regardless of notification prefs (works logged-out too).
  const html = supportTicketEmail({
    name: input.name,
    reference,
    subject: ticket.subject,
    slaText: SLA_TEXT[urgency],
    ctaUrl: `${APP_URL}/help/ticket/${reference}`,
  });
  sendEmail({ to: input.email, subject: `Bonza support — ${reference}`, html }).catch((err) =>
    logger.warn("Ticket confirmation email failed", { error: err.message })
  );

  return ticket;
}

async function addMessage(ticketId, { author, authorName, body, isInternal = false }) {
  const msg = await prisma.supportMessage.create({ data: { ticketId, author, authorName: authorName || null, body, isInternal } });
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: author === "user" ? "open" : "awaiting_user", ...(author !== "user" ? { firstReplyAt: new Date() } : {}) },
  }).catch(() => {});
  return msg;
}

module.exports = { createTicket, addMessage, SLA, SLA_TEXT };
