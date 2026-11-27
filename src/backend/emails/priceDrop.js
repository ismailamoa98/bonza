const { C, esc, money, tnum, wordmark, heading, lede, hr, button, footer, page } = require("./layout");

module.exports = function priceDropEmail({
  userName,
  destination,
  previousPrice,
  currentPrice,
  saving,
  creditsEarned,
  ctaUrl,
  unsubscribeUrl,
}) {
  const body =
    wordmark() +
    heading(`The price to ${esc(destination)} just dropped.`) +
    lede(`Hi ${esc(userName)} — since your last search, the cash price fell by ${money(saving)}.`) +
    `<div style="background:#ffffff;border-radius:16px;padding:24px;margin-bottom:16px;border:0.5px solid ${C.cardBorder};">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td valign="top">` +
    `<div style="font-size:11px;color:${C.inkFaint};font-weight:700;letter-spacing:1px;margin:0 0 4px;">WAS</div>` +
    `<div style="font-size:20px;color:${C.inkFaint};${tnum}text-decoration:line-through;">${money(previousPrice)}</div>` +
    `</td>` +
    `<td valign="top" align="right">` +
    `<div style="font-size:11px;color:${C.green};font-weight:700;letter-spacing:1px;margin:0 0 4px;">NOW</div>` +
    `<div style="font-size:28px;font-weight:800;color:${C.ink};${tnum}">${money(currentPrice)}</div>` +
    `</td></tr></table>` +
    hr() +
    `<div style="font-size:13px;color:${C.terra};font-weight:600;${tnum}">Book now and earn ${money(creditsEarned, 2)} Bonza Credits (3% back)</div>` +
    `</div>` +
    button(ctaUrl || "#", `Book for ${money(currentPrice)} →`) +
    footer(unsubscribeUrl);

  return page({
    preview: `Price dropped ${money(saving)} for ${destination} — now ${money(currentPrice)} return`,
    body,
  });
};
