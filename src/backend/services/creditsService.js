// services/creditsService.js — double-entry cashback ledger (balance = non-expired rows, clamped >=0).
const prisma = require("../config/database");
const { isProActive } = require("../middleware/requirePro");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { CASHBACK_RATE, CREDIT_EXPIRY_MONTHS } = require("../config/constants");

const NEVER_EXPIRES = new Date("9999-12-31T00:00:00.000Z");

const round2 = (n) => Math.round(n * 100) / 100;

function expiryFromNow(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

async function awardCashback({ userId, bookingId, cashValueGbp, leg }) {
  if (!(cashValueGbp > 0)) return null;

  const bookingCount = await prisma.booking.count({ where: { userId } });
  const isFirstBooking = bookingCount <= 1;

  if (!isFirstBooking) {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!isProActive(sub)) return null; // non-Pro users earn only on their first booking
  }

  if (isFirstBooking) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.deviceFingerprint) {
      const priorClaim = await prisma.bonzaCredit.findFirst({
        where: {
          source: "first_booking_bonus",
          user: { deviceFingerprint: user.deviceFingerprint, id: { not: userId } },
        },
      });
      if (priorClaim) {
        recordEvent(userId, EVENT_TYPES.CREDIT_FLAGGED, {
          reason: "duplicate_device_first_booking",
          bookingId,
        });
        return null; // held for review — do not auto-award
      }
    }
  }

  const credit = await prisma.bonzaCredit.create({
    data: {
      userId,
      amount: round2(cashValueGbp * CASHBACK_RATE),
      source: isFirstBooking ? "first_booking_bonus" : `cashback_${leg}`,
      bookingId,
      expiresAt: expiryFromNow(CREDIT_EXPIRY_MONTHS),
    },
  });

  recordEvent(userId, EVENT_TYPES.CREDIT_AWARDED, {
    bookingId,
    leg,
    amount: credit.amount,
    isFirstBooking,
  });

  return credit;
}

async function getCreditBalance(userId) {
  const credits = await prisma.bonzaCredit.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  const total = credits.reduce((sum, c) => sum + c.amount, 0);
  return { totalCreditsGbp: round2(Math.max(0, total)), credits };
}

async function redeemCredits(userId, amountToRedeem) {
  const amount = Number(amountToRedeem);
  if (!(amount > 0)) throw httpError(400, "Redemption amount must be positive");

  const { totalCreditsGbp } = await getCreditBalance(userId);
  if (amount > totalCreditsGbp) throw httpError(400, "Insufficient credits");

  await prisma.bonzaCredit.create({
    data: { userId, amount: -amount, source: "redeemed", expiresAt: NEVER_EXPIRES },
  });

  return { redeemed: round2(amount), remainingBalance: round2(totalCreditsGbp - amount) };
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { awardCashback, getCreditBalance, redeemCredits };
