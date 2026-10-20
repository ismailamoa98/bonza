// services/ratioFreshness.js — Phase 27 §27e-7. Transfers are irreversible, so a transfer recommendation
// built on a ratio we haven't re-verified within 24 hours is excluded from engine output entirely (the user
// is shown cash / holding instead). Pure + unit-tested.
const FRESH_RATIO_MS = 24 * 60 * 60 * 1000;

function ratioAgeMs(partner, now = Date.now()) {
  if (!partner?.ratioFetchedAt) return Infinity;
  return now - new Date(partner.ratioFetchedAt).getTime();
}

function isRatioFresh(partner, now = Date.now()) {
  return ratioAgeMs(partner, now) < FRESH_RATIO_MS;
}

const ratioAgeHours = (partner, now = Date.now()) => {
  const ms = ratioAgeMs(partner, now);
  return Number.isFinite(ms) ? Math.floor(ms / (60 * 60 * 1000)) : null;
};

module.exports = { FRESH_RATIO_MS, isRatioFresh, ratioAgeMs, ratioAgeHours };
