// services/creditsService.js — double-entry cashback ledger (balance = non-expired rows). §27a: balance-reading
// writes run at SERIALIZABLE with a 40001 retry (txSerializable). §27e-3: a refund posts a compensating
// (negative) entry; the balance may go negative and redemption is blocked until it clears.
// §27b: all amounts are integer pence (BonzaCredit.amountPence). No Float money anywhere in the ledger.
const prisma = require("../config/database");
const { isProActive } = require("../middleware/requirePro");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { txSerializable } = require("../utils/txSerializable");
const { cashbackRateFor, CREDIT_EXPIRY_MONTHS } = require("../config/constants");

const NEVER_EXPIRES = new Date("9999-12-31T00:00:00.000Z");

function expiryFromNow(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

// §27b — `cashAmountPence` is integer pence. Returns the created BonzaCredit (amountPence) or null.
async function awardCashback({ userId, bookingId, cashAmountPence, leg }) {
  if (!(cashAmountPence > 0)) return null;

  // Cashback only on higher-margin legs (hotels/cars) — flights earn no Credits (see config/constants).
  const rate = cashbackRateFor(leg);
  if (!(rate > 0)) return null;

  // All reads + the write are one serializable transaction so a concurrent award can't both pass the
  // first-booking check and double-award.
  const result = await txSerializable(async (tx) => {
    const bookingCount = await tx.booking.count({ where: { userId } });
    const isFirstBooking = bookingCount <= 1;

    if (!isFirstBooking) {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!isProActive(sub)) return { credit: null }; // non-Pro users earn only on their first booking
    }

    if (isFirstBooking) {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user?.deviceFingerprint) {
        const priorClaim = await tx.bonzaCredit.findFirst({
          where: {
            source: "first_booking_bonus",
            user: { deviceFingerprint: user.deviceFingerprint, id: { not: userId } },
          },
        });
        if (priorClaim) return { credit: null, flagged: true }; // held for review — do not auto-award
      }
    }

    const credit = await tx.bonzaCredit.create({
      data: {
        userId,
        amountPence: Math.round(cashAmountPence * rate), // integer pence × rate → nearest penny
        source: isFirstBooking ? "first_booking_bonus" : `cashback_${leg}`,
        bookingId,
        expiresAt: expiryFromNow(CREDIT_EXPIRY_MONTHS),
      },
    });
    return { credit, isFirstBooking };
  });

  // Side-effect logging happens after commit (never holds the lock).
  if (result.flagged) {
    await recordEvent(userId, EVENT_TYPES.CREDIT_FLAGGED, { reason: "duplicate_device_first_booking", bookingId });
    return null;
  }
  if (!result.credit) return null;
  recordEvent(userId, EVENT_TYPES.CREDIT_AWARDED, {
    bookingId,
    leg,
    amountPence: result.credit.amountPence,
    isFirstBooking: result.isFirstBooking,
  });
  return result.credit;
}

// §27e-3 — claw back a proportion of the credits awarded for a booking when it is refunded. The compensating
// entry is negative and may drive the balance below zero; redemption is then blocked until it clears.
async function reverseCredits({ userId, bookingId, proportion = 1 }) {
  const p = Math.min(1, Math.max(0, Number(proportion) || 0));
  if (!(p > 0)) return null;

  const entry = await txSerializable(async (tx) => {
    const awarded = await tx.bonzaCredit.findMany({ where: { userId, bookingId, amountPence: { gt: 0 } } });
    const totalAwarded = awarded.reduce((s, c) => s + c.amountPence, 0);
    const clawback = Math.round(totalAwarded * p); // integer pence
    if (!(clawback > 0)) return null;
    return tx.bonzaCredit.create({
      data: { userId, amountPence: -clawback, source: "refund_reversal", bookingId, expiresAt: NEVER_EXPIRES },
    });
  });

  if (entry) recordEvent(userId, EVENT_TYPES.CREDIT_AWARDED, { bookingId, amountPence: entry.amountPence, reversal: true });
  return entry;
}

// Raw sum (may be negative after a refund) and the clamped display balance — all integer pence.
async function getCreditBalance(userId) {
  const credits = await prisma.bonzaCredit.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  const raw = credits.reduce((sum, c) => sum + c.amountPence, 0);
  return { totalCreditsPence: Math.max(0, raw), rawBalancePence: raw, credits };
}

// §27b — `amountToRedeemPence` is integer pence.
async function redeemCredits(userId, amountToRedeemPence) {
  const amount = Math.round(Number(amountToRedeemPence));
  if (!(amount > 0)) throw httpError(400, "Redemption amount must be positive");

  // §27a — read-decide-write under serializable so two redemptions can't both pass the balance check.
  return txSerializable(async (tx) => {
    const rows = await tx.bonzaCredit.findMany({ where: { userId, expiresAt: { gt: new Date() } } });
    const raw = rows.reduce((s, c) => s + c.amountPence, 0);
    // §27e-3 — a negative balance (unsettled refund) blocks redemption until it clears.
    if (raw <= 0) throw httpError(409, "Your Credits are on hold while a recent refund settles.");
    if (amount > raw) throw httpError(400, "Insufficient credits");

    await tx.bonzaCredit.create({
      data: { userId, amountPence: -amount, source: "redeemed", expiresAt: NEVER_EXPIRES },
    });
    return { redeemedPence: amount, remainingBalancePence: raw - amount };
  });
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { awardCashback, reverseCredits, getCreditBalance, redeemCredits };
