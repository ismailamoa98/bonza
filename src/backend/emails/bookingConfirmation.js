const { C, esc, money, num, tnum, wordmark, heading, lede, kvRow, hr, button, footer, page } = require("./layout");

module.exports = function bookingConfirmationEmail({
  userName,
  destination,
  bookingReference,
  bookingType,
  description,
  checkIn,
  checkOut,
  cashValueGbp,
  pointsUsed,
  pointsProgramme,
  creditsAwarded,
  ctaUrl,
  unsubscribeUrl,
}) {
  const paidLabel = bookingType === "cash" ? "PAID" : "POINTS USED";
  const paidValue =
    bookingType === "cash"
      ? money(cashValueGbp)
      : `${num(pointsUsed)} ${esc(pointsProgramme || "")} pts`;

  const details =
    (bookingReference ? kvRow("REFERENCE", esc(bookingReference)) : "") +
    kvRow("BOOKING", `<span style="font-weight:400;color:${C.ink};">${esc(description)}</span>`) +
    (checkIn ? kvRow("DATES", `<span style="font-weight:400;color:${C.ink};">${esc(checkIn)} → ${esc(checkOut || "")}</span>`) : "") +
    hr() +
    kvRow(paidLabel, paidValue, { big: true, gap: 0 }) +
    (creditsAwarded > 0
      ? kvRow("BONZA CREDITS EARNED", `+ ${money(creditsAwarded, 2)}`, { color: C.terra, gap: 0 })
      : "");

  const body =
    wordmark() +
    `<div style="background:${C.greenBg};border-radius:12px;padding:16px 20px;margin-bottom:24px;">` +
    `<div style="color:${C.green};font-size:13px;font-weight:700;letter-spacing:0.5px;">BOOKING CONFIRMED</div></div>` +
    heading(`Your trip to ${esc(destination || "your destination")} is confirmed.`) +
    lede(`Hi ${esc(userName)} — here are your booking details.`) +
    `<div style="background:#ffffff;border-radius:16px;padding:24px;margin-bottom:16px;border:0.5px solid ${C.cardBorder};">${details}</div>` +
    button(ctaUrl || "#", "View booking →") +
    footer(unsubscribeUrl, "Bonza ·");

  return page({ preview: `Booking confirmed — ${description}`, body });
};
