const { C, esc, money, num, tnum, wordmark, heading, lede, button, footer, page } = require("./layout");

module.exports = function awardAlertEmail({
  userName,
  destination,
  programme,
  pointsCost,
  availableDates = [],
  centsPerPoint,
  cashPrice,
  creditsIfCash,
  bookingUrl,
  unsubscribeUrl,
}) {
  const dates = availableDates.length ? availableDates.map(esc).join(" · ") : "Multiple dates";
  const body =
    wordmark() +
    heading(`Award seats to ${esc(destination)} are available.`) +
    lede(`Hi ${esc(userName)} — Bonza found confirmed availability on your watched route.`) +
    `<div style="background:#ffffff;border-radius:16px;padding:24px;margin-bottom:16px;border:0.5px solid ${C.cardBorder};">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td valign="top" width="50%">` +
    `<div style="font-size:11px;font-weight:700;color:${C.inkMuted};letter-spacing:1px;margin:0 0 4px;">POINTS OPTION</div>` +
    `<div style="font-size:22px;font-weight:800;color:${C.ink};${tnum}margin:0 0 2px;">${num(pointsCost)} pts</div>` +
    `<div style="font-size:12px;color:${C.inkMuted};margin:0 0 4px;">${esc(programme)} · ${esc(centsPerPoint)}¢/pt</div>` +
    `<div style="font-size:12px;color:${C.inkSoft};margin:0;">Available: ${dates}</div>` +
    `</td>` +
    `<td valign="top" width="50%" align="right">` +
    `<div style="font-size:11px;font-weight:700;color:${C.inkMuted};letter-spacing:1px;margin:0 0 4px;">CASH OPTION</div>` +
    `<div style="font-size:22px;font-weight:800;color:${C.ink};${tnum}margin:0 0 2px;">${money(cashPrice)}</div>` +
    `<div style="font-size:12px;color:${C.terra};font-weight:600;margin:0;">+ earn ${money(creditsIfCash, 2)} credits</div>` +
    `</td></tr></table></div>` +
    button(bookingUrl || "#", `Book with ${programme} →`) +
    footer(unsubscribeUrl, "You're receiving this because you have award alerts enabled on Bonza.");

  return page({
    preview: `Award seats available: ${destination} for ${num(pointsCost)} ${programme} points`,
    body,
  });
};
