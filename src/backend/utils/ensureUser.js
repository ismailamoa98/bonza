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

  // Fetch the Clerk profile, but never let a hiccup there 500 the whole request.
  let email = `${userId}@users.bonza.app`;
  let name = null;
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    email =
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      email;
    name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  } catch (err) {
    // Keep the placeholder email; the row still gets created so the request can proceed.
  }

  try {
    return await prisma.user.create({ data: { id: userId, email, name } });
  } catch (err) {
    // P2002 on the unique email: a stale row from a previous Clerk instance still owns this
    // address (Clerk ids change when the instance is reset). Park that row's email to release
    // the constraint, then create the current user — self-heals without deleting any data.
    if (err.code === "P2002") {
      await prisma.user.updateMany({
        where: { email, id: { not: userId } },
        data: { email: `stale.${Date.now()}.${userId}@users.bonza.app` },
      });
      return prisma.user.create({ data: { id: userId, email, name } });
    }
    throw err;
  }
}

module.exports = { ensureUser };
