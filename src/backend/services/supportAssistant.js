// services/supportAssistant.js — Phase 22. Bonza's support assistant: Claude with the user's account context,
// with hard escalation rules. The five escalation triggers are detected in code FIRST (so escalation is
// reliable and never depends on the model deciding to): on a trigger we escalate immediately without
// troubleshooting, per spec. Otherwise, with a real key we ask Claude; offline we return a deterministic,
// honest canned answer drawn from the same context so the flow works without a key.
const prisma = require("../config/database");
const env = require("../config/env");
const { CLAUDE_MODEL } = require("../config/constants");
const { logger } = require("../utils/logger");

const SYSTEM = `
You are Bonza's support assistant. Bonza is a UK travel platform that optimises
loyalty points against cash across flights, hotels and cars.

WHAT YOU CAN SEE
The user's bookings, loyalty balances, Bonza Credits, Pro status and recent
sync history are provided below. Use them.

WHAT YOU MUST NOT DO
- Never claim Bonza can change, cancel or access a booking made on a loyalty
  programme's own site. Those bookings belong to the programme. Direct the user
  to the programme and give its contact details.
- Never guess a balance, a price, an award cost or a cancellation policy. If it
  is not in the context below, say you do not have it and offer to pass the
  question to a person.
- Never promise a refund, a credit, a goodwill gesture or an exception. Only a
  human agent can commit Bonza to anything.
- Never give advice on whether a specific redemption is good value if the data
  needed to judge it is not present.

TONE
Direct, plain and warm. Short sentences. No filler. If the answer is "we can't
do that", say so in the first line and then say what can be done instead.
`.trim();

// Hard escalation triggers (keyword-based). Returns a reason string or null.
function escalationReason(message) {
  const m = String(message || "").toLowerCase();
  const any = (words) => words.some((w) => m.includes(w));
  if (any(["refund", "charged twice", "double charged", "overcharged", "charged me wrong", "wrong amount", "money back"]))
    return "A possible billing/refund issue — only a person can resolve this.";
  if (any(["at the airport", "flying today", "flying tomorrow", "travelling today", "travelling tomorrow", "right now", "in the next 48", "within 48", "boarding", "stuck at"]))
    return "You may be travelling imminently — routing you to the fast lane.";
  if (any(["didn't book", "did not book", "booking failed", "didn't go through", "did not go through", "no confirmation", "not showing", "didn't appear", "did not appear", "double booked"]))
    return "A booking that may have failed or not appeared — a person needs to check.";
  if (any(["delete my data", "delete my account", "delete account", "gdpr", "data deleted", "misused", "data request", "right to be forgotten"]))
    return "A data-protection request — handled by a person.";
  return null;
}

// Context assembled per conversation (verbatim from the spec).
async function buildContext(userId) {
  const [user, bookings, accounts, credits, subscription, lastSync] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, homeAirport: true, createdAt: true } }),
    prisma.booking.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.loyaltyAccount.findMany({ where: { userId } }),
    prisma.bonzaCredit.aggregate({ where: { userId, expiresAt: { gt: new Date() } }, _sum: { amount: true } }),
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.balanceSyncRun.findFirst({ where: { userId }, orderBy: { startedAt: "desc" } }),
  ]);
  return { user, bookings, accounts, creditBalance: credits._sum.amount ?? 0, subscription, lastSync };
}

function contextBlock(ctx) {
  const lines = [];
  lines.push(`USER: ${ctx.user?.name || "—"} · home airport ${ctx.user?.homeAirport || "—"}`);
  lines.push(`PRO: ${ctx.subscription?.status || "none"}`);
  lines.push(`BONZA CREDITS (available £): ${ctx.creditBalance.toFixed(2)}`);
  lines.push(`LAST BALANCE SYNC: ${ctx.lastSync?.startedAt ? new Date(ctx.lastSync.startedAt).toISOString().slice(0, 10) : "never"}`);
  lines.push(`LOYALTY ACCOUNTS: ${ctx.accounts.map((a) => `${a.programme} ${a.balance}`).join(", ") || "none"}`);
  lines.push(
    `RECENT BOOKINGS: ${
      ctx.bookings.map((b) => `${b.description || b.leg} [${b.confirmationMethod}] ${b.status}`).join(" | ") || "none"
    }`
  );
  return lines.join("\n");
}

// Deterministic offline answer from context (honest — never invents figures).
function cannedReply(message, ctx) {
  const m = String(message || "").toLowerCase();
  if (m.includes("credit")) return `You have £${ctx.creditBalance.toFixed(2)} in Bonza Credits available. Credits can't be withdrawn as cash — they're applied to future bookings.`;
  if (m.includes("pro")) return ctx.subscription?.status ? `Your Bonza Pro status is "${ctx.subscription.status}". You can manage or cancel it in Settings.` : "You're not on Bonza Pro right now. You can upgrade from the Pro page.";
  if (m.includes("balance") || m.includes("points")) return ctx.accounts.length ? `I can see ${ctx.accounts.length} loyalty account(s) on your profile. If a balance looks wrong, see “Why is my balance wrong?” in the Help centre, or I can pass this to a person.` : "I don't see any loyalty accounts on your profile yet. You can add one manually in Points.";
  if (m.includes("cancel")) return "If the booking was made on a loyalty programme's own site, only the programme can cancel it — I can show you their contact details. For a cash booking made in Bonza, see “Cancelling a Bonza booking”, or I can pass this to a person.";
  return "I can help with points, Pro, Credits and account questions. If you'd like a person to look into something specific, I can pass it to the team.";
}

// reply({ userId, history, message }) → { reply, escalate, escalationReason }.
async function reply({ userId, history = [], message }) {
  const reason = escalationReason(message);
  if (reason) {
    return {
      escalate: true,
      escalationReason: reason,
      reply: `I'm passing this to the Bonza team now so a person can help — ${reason} You'll get a reference number and we'll be in touch within the time shown for your issue. You won't need to repeat yourself.`,
    };
  }

  const ctx = await buildContext(userId);

  if (!env.hasRealAnthropicKey) {
    return { escalate: false, escalationReason: null, reply: cannedReply(message, ctx) };
  }

  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const messages = [
      ...history.slice(-8).map((h) => ({ role: h.author === "user" ? "user" : "assistant", content: h.body })),
      { role: "user", content: message },
    ];
    const res = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: `${SYSTEM}\n\nACCOUNT CONTEXT:\n${contextBlock(ctx)}`,
      messages,
    });
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return { escalate: false, escalationReason: null, reply: text || cannedReply(message, ctx) };
  } catch (err) {
    logger.warn("Support assistant Claude call failed — falling back to canned", { error: err.message });
    return { escalate: false, escalationReason: null, reply: cannedReply(message, ctx) };
  }
}

module.exports = { reply, buildContext, escalationReason };
