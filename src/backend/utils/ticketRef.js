// utils/ticketRef.js — Phase 22. Support ticket references: 'BZ-' + 5 base32 chars excluding I, L, O, U so
// they're unambiguous read aloud over the phone. Retries on the (rare) unique clash.
const prisma = require("../config/database");

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford-ish base32 minus I, L, O, U

function generate() {
  let out = "BZ-";
  for (let i = 0; i < 5; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

// Returns a reference not already used by a SupportTicket.
async function uniqueTicketRef() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const ref = generate();
    const existing = await prisma.supportTicket.findUnique({ where: { reference: ref }, select: { id: true } });
    if (!existing) return ref;
  }
  // Astronomically unlikely — fall back to a timestamp suffix.
  return `${generate()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

module.exports = { uniqueTicketRef };
