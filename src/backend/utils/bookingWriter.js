// utils/bookingWriter.js — single writeBooking path: awards cashback, flips journey, records event.
// §27b: callers still pass money as major-unit GBP (cashValueGbp, …) — the GBP amounts search/booking quote.
// This single chokepoint converts major → integer pence (toMinor) for storage; money stays pence downstream.
const prisma = require("../config/database");
const { awardCashback } = require("../services/creditsService");
const { recordEvent, EVENT_TYPES } = require("./eventTracker");
const { triggerBookingConfirmation } = require("../services/notificationTriggers");
const { toMinor } = require("../../shared/format");

const toDate = (v) => (v ? new Date(v) : null);
const pence = (gbp) => (gbp != null ? toMinor(Number(gbp), "GBP") : null);

async function writeBooking(userId, data) {
  const {
    journeyId,
    tripId,
    origin,
    destination,
    checkIn,
    checkOut,
    travelers,
    leg,
    bookingType,
    supplier,
    supplierReference,
    description,
    propertyName,
    propertyPlaceId,
    cashValueGbp,
    pointsUsed,
    pointsProgramme,
    pointsValueGbp,
    serviceFeeGbp,
    confirmationMethod,
    idempotencyKey,
    paymentIntentId,
  } = data;

  const booking = await prisma.booking.create({
    data: {
      userId,
      journeyId: journeyId || null,
      tripId: tripId || null,
      origin: origin || null,
      destination: destination || null,
      checkIn: toDate(checkIn),
      checkOut: toDate(checkOut),
      travelers: travelers || 1,
      leg,
      bookingType,
      supplier,
      supplierReference: supplierReference || null,
      description: description || null,
      propertyName: propertyName || null,
      propertyPlaceId: propertyPlaceId || null,
      cashAmount: pence(cashValueGbp),
      cashCurrency: "GBP",
      pointsUsed: pointsUsed != null ? Number(pointsUsed) : null,
      pointsProgramme: pointsProgramme || null,
      pointsValuePence: pence(pointsValueGbp),
      serviceFeePence: pence(serviceFeeGbp),
      confirmedAt: new Date(),
      confirmationMethod,
      idempotencyKey: idempotencyKey || null,
      paymentIntentId: paymentIntentId || null,
      status: "confirmed",
    },
  });

  if (journeyId) {
    await prisma.userJourney
      .update({
        where: { id: journeyId },
        data: {
          bookingConfirmed: true,
          bookingMethod: confirmationMethod,
          bookingConfirmedAt: new Date(),
          bookingValuePence: cashValueGbp != null ? pence(cashValueGbp) : pence(pointsValueGbp),
        },
      })
      .catch(() => {}); // a stale/missing journey must not fail the booking
  }

  let creditsAwardedPence = null;
  if (bookingType === "cash" && cashValueGbp) {
    const credit = await awardCashback({ userId, bookingId: booking.id, cashAmountPence: pence(cashValueGbp), leg });
    if (credit) {
      creditsAwardedPence = credit.amountPence;
      await prisma.booking.update({ where: { id: booking.id }, data: { creditsAwardedPence } });
    }
  }

  await recordEvent(userId, EVENT_TYPES.BOOKING_CONFIRMED, {
    bookingId: booking.id,
    leg,
    bookingType,
    supplier,
    confirmationMethod,
    cashAmountPence: pence(cashValueGbp),
    pointsUsed: pointsUsed != null ? Number(pointsUsed) : null,
  });

  const result = creditsAwardedPence != null ? { ...booking, creditsAwardedPence } : booking;

  triggerBookingConfirmation(userId, result).catch(() => {});

  return result;
}

module.exports = { writeBooking };
