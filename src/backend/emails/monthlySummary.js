const { C, esc, money, num, tnum, wordmark, heading, button, footer, page } = require("./layout");

module.exports = function monthlySummaryEmail({
  userName,
  totalValueGbp,
  valueChangeGbp = 0,
  valueChangePercent = 0,
  accounts = [],
  bestRecommendation,
  creditBalance = 0,
  ctaUrl,
  unsubscribeUrl,
}) {
  const isGrowth = valueChangeGbp >= 0;
  const changeColor = isGrowth ? C.green : C.inkFaint;

  const accountRows = accounts
    .map(
      (a) =>
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>` +
        `<td valign="top">` +
        `<div style="font-size:13px;font-weight:600;color:${C.ink};margin:0 0 2px;">${esc(a.programme)}</div>` +
        `<div style="font-size:11px;color:${C.inkMuted};margin:0;">${num(a.balance)} pts${a.statusTier ? ` · ${esc(a.statusTier)}` : ""}</div>` +
        `</td>` +
        `<td valign="top" align="right"><div style="font-size:14px;font-weight:700;color:${C.ink};${tnum}">${money(a.valueGbp)}</div></td>` +
        `</tr></table>`
    )
    .join("");

  const bestRec = bestRecommendation
    ? `<div style="background:#FBE8E0;border-radius:16px;padding:20px 24px;margin-bottom:16px;">` +
      `<div style="font-size:11px;font-weight:700;color:${C.terra};letter-spacing:1px;margin:0 0 8px;">BEST REDEMPTION RIGHT NOW</div>` +
      `<div style="font-size:15px;font-weight:700;color:${C.ink};margin:0 0 4px;">${esc(bestRecommendation.destination)}</div>` +
      `<div style="font-size:12px;color:${C.inkSoft};margin:0;">${num(bestRecommendation.pointsCost)} pts · ${esc(bestRecommendation.centsPerPoint)}¢/pt · available now</div>` +
      `</div>`
    : "";

  const credits =
    creditBalance > 0
      ? `<div style="background:#ffffff;border-radius:16px;padding:16px 24px;margin-bottom:24px;border:0.5px solid ${C.cardBorder};">` +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
        `<td style="font-size:13px;color:${C.inkSoft};">Bonza Credits balance</td>` +
        `<td align="right" style="font-size:15px;font-weight:700;color:${C.terra};${tnum}">${money(creditBalance, 2)}</td>` +
        `</tr></table></div>`
      : "";

  const body =
    wordmark() +
    `<div style="font-size:11px;color:${C.inkMuted};font-weight:700;letter-spacing:1px;margin-bottom:32px;">YOUR MONTHLY SUMMARY</div>` +
    heading(`Your points are worth ${money(totalValueGbp)}.`) +
    `<div style="color:${changeColor};font-size:14px;font-weight:600;margin-bottom:32px;">${isGrowth ? "↑" : "↓"} ${money(Math.abs(valueChangeGbp))} (${isGrowth ? "+" : ""}${esc(valueChangePercent)}%) this month</div>` +
    `<div style="background:#ffffff;border-radius:16px;padding:24px;margin-bottom:16px;border:0.5px solid ${C.cardBorder};">` +
    `<div style="font-size:11px;font-weight:700;color:${C.inkMuted};letter-spacing:1px;margin:0 0 16px;">YOUR PROGRAMMES</div>` +
    accountRows +
    `</div>` +
    bestRec +
    credits +
    button(ctaUrl || "#", "View your recommendations →") +
    footer(unsubscribeUrl);

  return page({
    preview: `Your points are worth ${money(totalValueGbp)} — ${isGrowth ? "+" : ""}${money(Math.abs(valueChangeGbp))} this month`,
    body,
  });
};
