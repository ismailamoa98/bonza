// api/credits.js — Bonza Credits balance + redemption endpoints. §27b: all amounts are integer pence.
const express = require("express");
const { getCreditBalance, redeemCredits } = require("../services/creditsService");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const balance = await getCreditBalance(req.userId);
    res.json({ ...balance, currency: "GBP" });
  } catch (err) {
    next(err);
  }
});

router.post("/redeem", async (req, res, next) => {
  try {
    // §27b — redemption amount is integer pence (`amountPence`); legacy `amount` kept as a fallback.
    const body = req.body || {};
    const amountPence = body.amountPence != null ? body.amountPence : body.amount;
    const result = await redeemCredits(req.userId, amountPence);
    res.json({ ...result, currency: "GBP" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
