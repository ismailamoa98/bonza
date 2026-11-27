const { C, esc, money, num, tnum, wordmark, heading, lede, card, button, footer, page } = require("./layout");

module.exports = function expiryWarningEmail({
  userName,
  programme,
  balance,
  valueGbp,
  daysUntilExpiry,
  bestRedemption,
  ctaUrl,
  unsubscribeUrl,
}) {
  const urgency = daysUntilExpiry <= 30 ? "#E85C33" : C.terra;
  const best = bestRedemption
    ? card(
        `<div style="font-size:13px;font-weight:700;color:${C.ink};margin:0 0 4px;">${esc(bestRedemption.destination)}</div>` +
          (bestRedemption.specLine
            ? `<div style="font-size:12px;color:${C.inkMuted};margin:0 0 12px;">${esc(bestRedemption.specLine)}</div>`
            : "") +
          `<div style="font-size:20px;font-weight:800;color:${C.ink};${tnum}margin:0 0 2px;">${num(bestRedemption.pointsCost)} pts</div>` +
          `<div style="font-size:12px;color:${C.terra};font-weight:600;margin:0;">${esc(bestRedemption.centsPerPoint)}¢/pt${bestRedemption.valueRating ? ` — ${esc(bestRedemption.valueRating)}` : ""}</div>`
      )
    : "";

  const body =
    wordmark() +
    `<div style="background:${urgency};border-radius:12px;padding:16px 20px;margin-bottom:24px;">` +
    `<div style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.5px;">${num(daysUntilExpiry)} DAYS UNTIL EXPIRY</div></div>` +
    heading(`Your ${esc(programme)} points expire soon.`) +
    lede(
      `Hi ${esc(userName)} — you have ${num(balance)} points worth ~${money(valueGbp)}. Here's the best way to use them before they're gone.`
    ) +
    best +
    button(ctaUrl || "#", "View availability →") +
    footer(unsubscribeUrl);

  return page({
    preview: `Your ${programme} points expire in ${daysUntilExpiry} days — here's the best use now`,
    body,
  });
};
