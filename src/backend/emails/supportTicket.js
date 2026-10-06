// emails/supportTicket.js — Phase 22. Ticket confirmation email: the reference, the SLA, and a link to the thread.
const { C, esc, wordmark, heading, lede, card, kvRow, hr, button, footer, page } = require("./layout");

module.exports = function supportTicketEmail({ name, reference, subject, slaText, ctaUrl }) {
  const inner =
    wordmark() +
    heading("We've got your request") +
    lede(`Thanks${name ? `, ${esc(name)}` : ""} — a Bonza agent will take a look. You don't need to do anything else; quote your reference if you get in touch again.`) +
    card(
      kvRow("REFERENCE", `<span style="font-weight:700;color:${C.ink};letter-spacing:0.04em;">${esc(reference)}</span>`) +
        kvRow("SUBJECT", `<span style="font-weight:400;color:${C.ink};">${esc(subject)}</span>`) +
        hr() +
        kvRow("WE'LL REPLY", `<span style="font-weight:400;color:${C.ink};">${esc(slaText)}</span>`)
    ) +
    (ctaUrl ? button(ctaUrl, "View your request") : "");

  return page(inner + footer());
};
