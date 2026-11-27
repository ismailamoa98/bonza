// api/chat.js — chat advisor turn; adds a loyalty nudge when no accounts are connected.
const express = require("express");
const prisma = require("../config/database");
const { chatReply } = require("../utils/claudeOptimizer");
const { buildLoyaltyNudge, NO_LOYALTY_MESSAGE } = require("../utils/loyaltyNudge");

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

    const loyaltyCount = await prisma.loyaltyAccount.count({ where: { userId: req.userId } });
    let loyaltyNudge = null;
    let responseText = reply.response;
    if (loyaltyCount === 0) {
      loyaltyNudge = buildLoyaltyNudge();
      if (!responseText.includes(NO_LOYALTY_MESSAGE)) {
        responseText = `${responseText}\n\n${NO_LOYALTY_MESSAGE}`;
      }
    }

    await prisma.chatMessage.create({
      data: { sessionId: session.id, role: "bonza", content: responseText },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: { selectedScenarioId: reply.updatedSelectedScenarioId || null },
    });

    res.json({
      response: responseText,
      updatedSelectedScenarioId: reply.updatedSelectedScenarioId,
      shouldHighlightCard: reply.shouldHighlightCard,
      loyaltyNudge,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
