// utils/ensureUser.js — Just-in-time Clerk -> Prisma user sync.
// Clerk owns identity but doesn't write to our database. The webhook (api/webhooks.js)
// keeps prod in sync on user.created; this helper covers everything else — local dev
// without a public webhook tunnel, and any user that signed in before the webhook
// fired — by creating the Prisma profile row on first authenticated request.
//
// Cheap path: a findUnique on the primary key. Only when the row is missing do we
// call Clerk for the profile, so the steady-state cost is one indexed lookup.
const { clerkClient } = require("@clerk/express");
const prisma = require("../config/database");

async function ensureUser(userId) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerkUser = await clerkClient.users.getUser(userId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    `${userId}@users.bonza.app`;
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  // upsert (not create) to absorb a race with the webhook firing concurrently.
  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email, name },
  });
}

module.exports = { ensureUser };
