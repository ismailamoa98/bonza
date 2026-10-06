// api/support.js — Phase 22. Support tickets, the assistant, and programme-contact lookup. Ticket creation is
// optionalAuth (works logged-out with email+name); reading tickets requires auth (own) or email+ref; the
// assistant is auth + rate-limited (escalation funnels into a real ticket); programme-contact is public.
const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { optionalAuth } = require("../middleware/optionalAuth");
const auth = require("../middleware/auth");
const { createTicket, addMessage } = require("../services/supportTickets");
const assistant = require("../services/supportAssistant");

// POST /tickets — create a ticket (logged-in or out).
router.post("/tickets", optionalAuth, async (req, res, next) => {
  try {
    const { email, name, urgency, category, subject, message, bookingId } = req.body || {};
    const resolvedEmail = email || null;
    if (!resolvedEmail && !req.userId) return res.status(400).json({ error: { message: "Email is required" } });

    // If logged in and no email provided, use the account email.
    let finalEmail = resolvedEmail;
    if (!finalEmail && req.userId) {
      const u = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true, name: true } });
      finalEmail = u?.email;
    }
    if (!finalEmail) return res.status(400).json({ error: { message: "Email is required" } });

    // A bookingId is only honoured if it belongs to the caller (IDOR guard).
    let safeBookingId = null;
    if (bookingId && req.userId) {
      const owned = await prisma.booking.findFirst({ where: { id: bookingId, userId: req.userId }, select: { id: true } });
      safeBookingId = owned?.id || null;
    }

    const ticket = await createTicket({
      userId: req.userId || null,
      email: finalEmail,
      name,
      urgency,
      category,
      subject,
      message,
      bookingId: safeBookingId,
      userAgent: req.headers["user-agent"] || null,
    });
    res.status(201).json({ reference: ticket.reference, status: ticket.status, slaTarget: ticket.slaTarget });
  } catch (err) {
    next(err);
  }
});

// GET /tickets — the caller's own tickets.
router.get("/tickets", auth, async (req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      select: { reference: true, subject: true, status: true, urgency: true, slaTarget: true, createdAt: true },
    });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

// GET /tickets/open — §22l. The caller's open/awaiting tickets, for the contact page.
router.get("/tickets/open", auth, async (req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.userId, status: { in: ["open", "awaiting_user"] } },
      orderBy: { createdAt: "desc" },
      select: { reference: true, subject: true, status: true, createdAt: true },
    });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

// GET /tickets/:ref — one ticket thread (owner, or email+ref match for logged-out).
router.get("/tickets/:ref", async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { reference: req.params.ref },
      include: { messages: { where: { isInternal: false }, orderBy: { createdAt: "asc" } } },
    });
    if (!ticket) return res.status(404).json({ error: { message: "Not found" } });

    // Authorise: the owner, or a matching email supplied via ?email=.
    const { userId } = require("@clerk/express").getAuth(req);
    const emailMatch = req.query.email && String(req.query.email).toLowerCase() === ticket.email.toLowerCase();
    if (!(userId && ticket.userId === userId) && !emailMatch) {
      return res.status(403).json({ error: { message: "Provide the email used to raise this ticket" } });
    }
    res.json({ ticket: { reference: ticket.reference, subject: ticket.subject, status: ticket.status, urgency: ticket.urgency, slaTarget: ticket.slaTarget, createdAt: ticket.createdAt, messages: ticket.messages.map((m) => ({ author: m.author, authorName: m.authorName, body: m.body, createdAt: m.createdAt })) } });
  } catch (err) {
    next(err);
  }
});

// POST /tickets/:id/messages — add a user message to a ticket they own.
router.post("/tickets/:id/messages", auth, async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({ where: { id: req.params.id, userId: req.userId }, select: { id: true } });
    if (!ticket) return res.status(404).json({ error: { message: "Not found" } });
    const msg = await addMessage(ticket.id, { author: "user", body: String(req.body?.body || "").slice(0, 5000) });
    res.status(201).json({ ok: true, createdAt: msg.createdAt });
  } catch (err) {
    next(err);
  }
});

// POST /assistant — ask the support assistant. On an escalation trigger, a real ticket is created carrying
// the transcript and its reference is returned; the escalation path is never blocked by the rate limit (the
// limiter is applied in server.js to this route; escalation still returns here even if a limit is near).
router.post("/assistant", auth, async (req, res, next) => {
  try {
    const { message, history } = req.body || {};
    if (!message || !String(message).trim()) return res.status(400).json({ error: { message: "message is required" } });

    const result = await assistant.reply({ userId: req.userId, history: history || [], message });

    let reference = null;
    if (result.escalate) {
      const u = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true, name: true } });
      const transcript = [
        ...(history || []).map((h) => ({ author: h.author === "user" ? "user" : "assistant", body: h.body })),
        { author: "user", body: message },
        { author: "assistant", body: result.reply },
      ];
      const urgency = /travelling|airport|48/.test(result.escalationReason || "") ? "travelling_now" : "booking_issue";
      const ticket = await createTicket({
        userId: req.userId,
        email: u?.email,
        name: u?.name,
        urgency,
        category: "general",
        subject: "Escalated from the support assistant",
        message,
        userAgent: req.headers["user-agent"] || null,
        transcript,
      });
      reference = ticket.reference;
    }

    res.json({ reply: result.reply, escalated: result.escalate, reference });
  } catch (err) {
    next(err);
  }
});

// GET /programme-contact/:prog — public; the contact/manage details for the third-party boundary.
router.get("/programme-contact/:prog", async (req, res, next) => {
  try {
    const contact = await prisma.programmeContact.findUnique({ where: { programme: req.params.prog } });
    if (!contact) return res.status(404).json({ error: { message: "Not found" } });
    res.json({ contact });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
