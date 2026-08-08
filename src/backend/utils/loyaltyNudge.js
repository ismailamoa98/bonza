// utils/loyaltyNudge.js — chat nudge when the user has no connected loyalty accounts.
const NO_LOYALTY_MESSAGE =
  "You haven't connected any loyalty accounts yet — you could be leaving points on the " +
  "table. Connect them and I'll factor your balances into every option.";

function buildLoyaltyNudge() {
  return {
    code: "NO_LOYALTY_CONNECTED",
    message: NO_LOYALTY_MESSAGE,
    action: { label: "Connect loyalty", href: "/dashboard" },
  };
}

module.exports = { buildLoyaltyNudge, NO_LOYALTY_MESSAGE };
