// services/notificationTriggers.js — fire-and-forget triggers per alert moment (never throw).
const env = require("../config/env");
const prisma = require("../config/database");
const { createAndSend } = require("./emailService");
const templates = require("../emails");
const { logger } = require("../utils/logger");

const FRONTEND = env.FRONTEND_URL;

function unsubscribeUrl(userId, type) {
  return `${FRONTEND}/api/v1/notifications/unsubscribe?type=${encodeURIComponent(type)}&uid=${encodeURIComponent(userId)}`;
}

const firstName = (name) => (name ? String(name).split(" ")[0] : "there");

async function loadUser(userId) {
  return prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }).catch(() => null);
}

async function triggerAwardAlert(userId, rec) {
  try {
    const points = rec.pointsOption;
    if (!points) return;
    const user = await loadUser(userId);
    if (!user?.email) return;

    const cash = rec.cashOption || {};
    await createAndSend({
      userId,
      type: "award_availability",
      title: `Award seats to ${rec.destinationCity} available`,
      body: `${Number(points.pointsCost).toLocaleString("en-GB")} ${points.programme} pts · ${points.centsPerPoint}¢/pt`,
      ctaLabel: "View availability →",
      ctaUrl: `${FRONTEND}/optimize?dest=${encodeURIComponent(rec.destination)}`,
      programme: points.programme,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      emailSubject: `Award seats to ${rec.destinationCity} — ${Number(points.pointsCost).toLocaleString("en-GB")} pts`,
      emailHtml: templates.awardAlert({
        userName: firstName(user.name),
        destination: rec.destinationCity,
        programme: points.programme,
        pointsCost: points.pointsCost,
        availableDates: points.availableDates || [],
        centsPerPoint: points.centsPerPoint,
        cashPrice: cash.priceGbp || 0,
        creditsIfCash: cash.creditsEarned || rec.creditsIfCash || 0,
        bookingUrl: points.bookingUrl,
        unsubscribeUrl: unsubscribeUrl(userId, "award_availability"),
      }),
      userEmail: user.email,
    });
  } catch (err) {
    logger.error("[notificationTriggers] award alert failed", err);
  }
}

async function triggerExpiryWarning(userId, account, bestRedemption) {
  try {
    if (!account?.pointsExpireAt) return;
    const daysUntilExpiry = Math.ceil((new Date(account.pointsExpireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const milestone = [90, 60, 30].find((m) => daysUntilExpiry <= m && daysUntilExpiry > m - 7);
    if (!milestone) return;

    const alreadySent = await prisma.notification.findFirst({
      where: {
        userId,
        type: "expiry_warning",
        programme: account.programme,
        createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    if (alreadySent) return;

    const user = await loadUser(userId);
    if (!user?.email) return;

    await createAndSend({
      userId,
      type: "expiry_warning",
      title: `${account.programme} points expire in ${daysUntilExpiry} days`,
      body: `${Number(account.balance).toLocaleString("en-GB")} pts worth ~£${Math.round(account.valueGbp)}`,
      ctaLabel: "Use points now →",
      ctaUrl: `${FRONTEND}/dashboard`,
      programme: account.programme,
      emailSubject: `Your ${account.programme} points expire in ${daysUntilExpiry} days`,
      emailHtml: templates.expiryWarning({
        userName: firstName(user.name),
        programme: account.programme,
        balance: account.balance,
        valueGbp: account.valueGbp,
        daysUntilExpiry,
        bestRedemption: bestRedemption
          ? {
              destination: bestRedemption.destinationCity || bestRedemption.destination,
              specLine: bestRedemption.specLine,
              pointsCost: bestRedemption.pointsCost,
              centsPerPoint: bestRedemption.centsPerPoint,
              valueRating: bestRedemption.valueRating,
            }
          : null,
        ctaUrl: `${FRONTEND}/dashboard`,
        unsubscribeUrl: unsubscribeUrl(userId, "expiry_warning"),
      }),
      userEmail: user.email,
    });
  } catch (err) {
    logger.error("[notificationTriggers] expiry warning failed", err);
  }
}

async function triggerPriceDrop(userId, route, previousPrice, currentPrice, offerId) {
  try {
    const saving = Math.round((previousPrice - currentPrice) * 100) / 100;
    if (saving < 20) return; // not worth alerting under £20

    const user = await loadUser(userId);
    if (!user?.email) return;

    const creditsEarned = Math.round(currentPrice * 0.03 * 100) / 100;
    await createAndSend({
      userId,
      type: "price_drop",
      title: `Price dropped £${saving} for ${route.destination}`,
      body: `Now £${currentPrice} return — was £${previousPrice}`,
      ctaLabel: "Book now →",
      ctaUrl: offerId ? `${FRONTEND}/booking?offerId=${encodeURIComponent(offerId)}` : `${FRONTEND}/optimize?dest=${encodeURIComponent(route.destination)}`,
      emailSubject: `Price drop: ${route.destination} now £${currentPrice} (was £${previousPrice})`,
      emailHtml: templates.priceDrop({
        userName: firstName(user.name),
        destination: route.destination,
        previousPrice,
        currentPrice,
        saving,
        creditsEarned,
        ctaUrl: offerId ? `${FRONTEND}/booking?offerId=${encodeURIComponent(offerId)}` : `${FRONTEND}/dashboard`,
        unsubscribeUrl: unsubscribeUrl(userId, "price_drop"),
      }),
      userEmail: user.email,
    });
  } catch (err) {
    logger.error("[notificationTriggers] price drop failed", err);
  }
}

async function triggerMonthlySummary(userId) {
  try {
    const [user, accounts, creditAgg, bestRec] = await Promise.all([
      loadUser(userId),
      prisma.loyaltyAccount.findMany({ where: { userId }, orderBy: { valueGbp: "desc" } }),
      prisma.bonzaCredit.aggregate({ where: { userId, expiresAt: { gt: new Date() } }, _sum: { amount: true } }),
      prisma.personalisedRecommendation.findFirst({
        where: { userId, isActive: true, pointsValueRating: "excellent" },
        orderBy: { generatedAt: "desc" },
      }),
    ]);
    if (!user?.email || !accounts.length) return;

    const totalValueGbp = Math.round(accounts.reduce((s, a) => s + a.valueGbp, 0));
    const creditBalance = Math.max(0, creditAgg._sum.amount || 0);

    await createAndSend({
      userId,
      type: "monthly_summary",
      title: "Your monthly loyalty summary",
      body: `Your points are worth £${totalValueGbp} total`,
      ctaLabel: "View dashboard →",
      ctaUrl: `${FRONTEND}/dashboard`,
      emailSubject: `Your Bonza monthly summary — £${totalValueGbp} in points`,
      emailHtml: templates.monthlySummary({
        userName: firstName(user.name),
        totalValueGbp,
        valueChangeGbp: 0,
        valueChangePercent: 0,
        accounts: accounts.map((a) => ({
          programme: a.programme,
          balance: a.balance,
          valueGbp: a.valueGbp,
          statusTier: a.statusTier,
        })),
        bestRecommendation: bestRec
          ? {
              destination: bestRec.destinationCity,
              pointsCost: bestRec.pointsOption?.pointsCost,
              centsPerPoint: bestRec.centsPerPoint,
            }
          : null,
        creditBalance,
        ctaUrl: `${FRONTEND}/dashboard`,
        unsubscribeUrl: unsubscribeUrl(userId, "monthly_summary"),
      }),
      userEmail: user.email,
    });
  } catch (err) {
    logger.error("[notificationTriggers] monthly summary failed", err);
  }
}

async function triggerBookingConfirmation(userId, booking) {
  try {
    const user = await loadUser(userId);
    if (!user?.email) return;

    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : null);
    await createAndSend({
      userId,
      type: "booking_confirmed",
      title: `Booking confirmed — ${booking.description || booking.leg}`,
      body:
        booking.bookingType === "cash"
          ? `£${booking.cashValueGbp} · ${booking.description || booking.leg}`
          : `${Number(booking.pointsUsed || 0).toLocaleString("en-GB")} pts · ${booking.description || booking.leg}`,
      ctaLabel: "View booking →",
      ctaUrl: `${FRONTEND}/dashboard`,
      bookingId: booking.id,
      emailSubject: `Booking confirmed — ${booking.description || booking.leg}`,
      emailHtml: templates.bookingConfirmation({
        userName: firstName(user.name),
        destination: booking.destination,
        bookingReference: booking.supplierReference,
        bookingType: booking.bookingType,
        description: booking.description || booking.leg,
        checkIn: fmtDate(booking.checkIn),
        checkOut: fmtDate(booking.checkOut),
        cashValueGbp: booking.cashValueGbp,
        pointsUsed: booking.pointsUsed,
        pointsProgramme: booking.pointsProgramme,
        creditsAwarded: booking.creditsAwarded || 0,
        ctaUrl: `${FRONTEND}/dashboard`,
        unsubscribeUrl: unsubscribeUrl(userId, "booking_confirmed"),
      }),
      userEmail: user.email,
    });
  } catch (err) {
    logger.error("[notificationTriggers] booking confirmation failed", err);
  }
}

async function triggerProActivated(userId) {
  try {
    await createAndSend({
      userId,
      type: "pro_activated",
      title: "Bonza Pro is active",
      body: "You now have award search, the redemption engine, and unlimited cashback.",
      ctaLabel: "Explore Pro →",
      ctaUrl: `${FRONTEND}/dashboard`,
    });
  } catch (err) {
    logger.error("[notificationTriggers] pro activated failed", err);
  }
}

module.exports = {
  triggerAwardAlert,
  triggerExpiryWarning,
  triggerPriceDrop,
  triggerMonthlySummary,
  triggerBookingConfirmation,
  triggerProActivated,
};
