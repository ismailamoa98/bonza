// api/chat.js — Conversational advisor endpoint.
// POST /api/v1/chat { tripId, selectedScenarioId, message } — persists the
// exchange on a ChatSession and returns Bonza's reply plus which scenario card
// to highlight (the selection may change as the user chats).
const express = require("express");
const prisma = require("../config/database");
const { chatReply } = require("../utils/claudeOptimizer");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { tripId, selectedScenarioId, message } = req.body || {};
    if (!tripId || !message) {
      const err = new Error("tripId and message are required");
      err.status = 400;
      throw err;
    }

    const trip = await prisma.trip.findFirst({ where: { id: tripId, userId: req.userId } });
    if (!trip) {
      const err = new Error("Trip not found");
      err.status = 404;
      throw err;
    }

    const scenarios = await prisma.scenario.findMany({ where: { tripId } });

    // Find or create the chat session for this user + trip.
    let session = await prisma.chatSession.findFirst({ where: { userId: req.userId, tripId } });
    if (!session) {
      session = await prisma.chatSession.create({
        data: { userId: req.userId, tripId, selectedScenarioId: selectedScenarioId || null },
      });
    }

    const history = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
    });

    await prisma.chatMessage.create({
      data: { sessionId: session.id, role: "user", content: message },
    });

    const reply = await chatReply({
      trip,
      scenarios,
      selectedScenarioId,
      message,
      history: history.map((m) => ({ role: m.role, content: m.content })),
    });

    await prisma.chatMessage.create({
      data: { sessionId: session.id, role: "bonza", content: reply.response },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: { selectedScenarioId: reply.updatedSelectedScenarioId || null },
    });

    res.json({
      response: reply.response,
      updatedSelectedScenarioId: reply.updatedSelectedScenarioId,
      shouldHighlightCard: reply.shouldHighlightCard,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
