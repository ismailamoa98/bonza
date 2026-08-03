// utils/bookingWriter.js — single writeBooking path: awards cashback, flips journey, records event.
const prisma = require("../config/database");
const { awardCashback } = require("../services/creditsService");
const { recordEvent, EVENT_TYPES } = require("./eventTracker");
const { triggerBookingConfirmation } = require("../services/notificationTriggers");

const toDate = (v) => (v ? new Date(v) : null);

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
    cashValueGbp,
    pointsUsed,
    pointsProgramme,
    pointsValueGbp,
    serviceFeeGbp,
    confirmationMethod,
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
      cashValueGbp: cashValueGbp != null ? Number(cashValueGbp) : null,
      pointsUsed: pointsUsed != null ? Number(pointsUsed) : null,
      pointsProgramme: pointsProgramme || null,
      pointsValueGbp: pointsValueGbp != null ? Number(pointsValueGbp) : null,
      serviceFeeGbp: serviceFeeGbp != null ? Number(serviceFeeGbp) : null,
      confirmedAt: new Date(),
      confirmationMethod,
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
          bookingValueGbp: cashValueGbp != null ? Number(cashValueGbp) : pointsValueGbp != null ? Number(pointsValueGbp) : null,
        },
      })
      .catch(() => {}); // a stale/missing journey must not fail the booking
  }

  let creditsAwarded = null;
  if (bookingType === "cash" && cashValueGbp) {
    const credit = await awardCashback({ userId, bookingId: booking.id, cashValueGbp: Number(cashValueGbp), leg });
    if (credit) {
      creditsAwarded = credit.amount;
      await prisma.booking.update({ where: { id: booking.id }, data: { creditsAwarded } });
    }
  }

  await recordEvent(userId, EVENT_TYPES.BOOKING_CONFIRMED, {
    bookingId: booking.id,
    leg,
    bookingType,
    supplier,
    confirmationMethod,
    cashValueGbp: cashValueGbp != null ? Number(cashValueGbp) : null,
    pointsUsed: pointsUsed != null ? Number(pointsUsed) : null,
  });

  const result = creditsAwarded != null ? { ...booking, creditsAwarded } : booking;

  triggerBookingConfirmation(userId, result).catch(() => {});

  return result;
}

module.exports = { writeBooking };
