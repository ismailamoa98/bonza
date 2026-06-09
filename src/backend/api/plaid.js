// api/plaid.js — Loyalty points retrieval (MOCK).
// GET /api/v1/user/loyalty-points — returns the authenticated user's mock
// loyalty balances. The frontend calls this on Step 1 to auto-fill points.
const express = require("express");
const { getMockPlaidData } = require("../utils/mockPlaidData");

const router = express.Router();

router.get("/loyalty-points", (req, res) => {
  res.json(getMockPlaidData(req.userId));
});

module.exports = router;
