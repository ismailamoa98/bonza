// utils/eventTracker.js — append-only UserEvent log (best-effort; never breaks the caller).
const prisma = require("../config/database");
const { logger } = require("./logger");

const EVENT_TYPES = {
  LOYALTY_SYNCED: "loyalty_synced", // email parse / mock sync completed
  OPTIMISATION_RUN: "optimisation_run", // /optimize/redemption called
  AWARD_SEARCH_RUN: "award_search_run", // Seats.aero queried
  SCENARIO_SELECTED: "scenario_selected", // user picked a redemption option
  TRANSFER_CONFIRMED: "transfer_confirmed", // user confirmed they transferred points
  DEEP_LINK_CLICKED: "deep_link_clicked", // user clicked "Book with [Programme]"
  BOOKING_SELF_REPORTED: "booking_self_reported", // user tapped "Yes I booked it"
  BOOKING_CONFIRMED: "booking_confirmed", // duffel / postback / self-report / transfer-proxy
  BOOKING_CANCELLED: "booking_cancelled",
  CREDIT_AWARDED: "credit_awarded", // cashback issued
  CREDIT_FLAGGED: "credit_flagged_for_review", // suspected duplicate first-booking claim
  PRO_UPGRADED: "pro_upgraded",
  PRO_CANCELLED: "pro_cancelled",
  RECOMMENDATIONS_GENERATED: "recommendations_generated", // personalisation job produced cards (8n)
};

async function recordEvent(userId, type, metadata = {}, sessionId = null) {
  try {
    return await prisma.userEvent.create({
      data: { userId, type, metadata, sessionId },
    });
  } catch (err) {
    logger.error(`[eventTracker] failed to record ${type}`, err);
    return null;
  }
}

module.exports = { recordEvent, EVENT_TYPES };
