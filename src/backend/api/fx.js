// api/fx.js — GET /api/v1/fx → GBP-base display rates ({ base:"GBP", rates, source, asOf }). Public.
const express = require("express");
const { getRates } = require("../services/fxService");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { rates, source, asOf } = await getRates();
    res.json({ base: "GBP", rates, source, asOf });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
