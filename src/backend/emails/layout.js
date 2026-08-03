// emails/layout.js — shared email HTML shell (header/footer/button).
const C = {
  cream: "#F4F3EE",
  ink: "#2a2420",
  inkSoft: "#6a6258",
  inkMuted: "#9a9088",
  inkFaint: "#b3aaa0",
  terra: "#da7756",
  green: "#1E7E40",
  greenBg: "#EAF6EE",
  line: "#f0ece5",
  cardBorder: "rgba(40,30,20,0.08)",
  serif: "Georgia, 'Times New Roman', serif",
  sans: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
};

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (n, dp = 0) =>
  `£${Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const num = (n) => Number(n || 0).toLocaleString("en-GB");
const tnum = "font-variant-numeric:tabular-nums;";

const wordmark = () =>
  `<div style="font-family:${C.serif};font-size:22px;font-weight:600;color:${C.ink};margin-bottom:32px;">Bonza</div>`;

const heading = (text) =>
  `<h1 style="font-family:${C.serif};font-size:27px;font-weight:600;color:${C.ink};line-height:1.15;margin:0 0 8px;">${text}</h1>`;

const lede = (text) =>
  `<p style="color:${C.inkSoft};font-size:15px;line-height:1.5;margin:0 0 24px;">${text}</p>`;

const card = (inner) =>
  `<div style="background:#ffffff;border-radius:16px;padding:24px;margin-bottom:16px;border:0.5px solid ${C.cardBorder};">${inner}</div>`;

const button = (href, label) =>
  `<a href="${esc(href)}" style="background:${C.terra};color:#ffffff;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:600;display:block;text-align:center;text-decoration:none;margin-bottom:32px;">${esc(label)}</a>`;

const kvRow = (label, value, opts = {}) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${opts.gap ?? 12}px;"><tr>` +
  `<td style="font-size:11px;font-weight:700;color:${C.inkMuted};letter-spacing:1px;">${esc(label)}</td>` +
  `<td align="right" style="font-size:${opts.big ? "15px" : "13px"};font-weight:${opts.big ? "800" : "700"};color:${opts.color || C.ink};${tnum}">${value}</td>` +
  `</tr></table>`;

const hr = () => `<div style="border-top:1px solid ${C.line};margin:16px 0;"></div>`;

const footer = (unsubscribeUrl, note) =>
  `<div style="border-top:1px solid ${C.line};margin-bottom:24px;"></div>` +
  `<p style="font-size:11px;color:${C.inkFaint};text-align:center;line-height:1.5;">` +
  (note ? `${esc(note)} ` : "") +
  (unsubscribeUrl ? `<a href="${esc(unsubscribeUrl)}" style="color:${C.inkFaint};">Unsubscribe</a>` : "") +
  `</p>`;

const page = ({ preview, body }) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
  `<body style="margin:0;background:${C.cream};font-family:${C.sans};">` +
  (preview
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preview)}</div>`
    : "") +
  `<div style="max-width:560px;margin:0 auto;padding:40px 20px;">${body}</div>` +
  `</body></html>`;

module.exports = { C, esc, money, num, tnum, wordmark, heading, lede, card, button, kvRow, hr, footer, page };
