// api/credits.js — Bonza Credits balance + redemption endpoints.
const express = require("express");
const { getCreditBalance, redeemCredits } = require("../services/creditsService");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await getCreditBalance(req.userId));
  } catch (err) {
    next(err);
  }
});

router.post("/redeem", async (req, res, next) => {
  try {
    const { amount } = req.body || {};
    const result = await redeemCredits(req.userId, amount);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
