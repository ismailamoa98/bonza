// utils/mockPlaidData.js — Mock loyalty-points data.
// Returns fake Plaid-style loyalty balances used by api/plaid.js during
// development. Real Plaid integration is a post-launch concern.

// eslint-disable-next-line no-unused-vars
exports.getMockPlaidData = (userId) => ({
  amex: 50000,
  chaseUr: 30000,
  unitedMiles: 15000,
  marriottPoints: 0,
  other: {},
});
