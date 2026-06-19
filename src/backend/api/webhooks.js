// api/webhooks.js — Clerk webhook receiver.
// Clerk doesn't write to our database, so we sync on its events: user.created
// inserts the Prisma profile row, user.deleted removes it. Mounted in server.js
// with a RAW body parser (svix verifies the signature over the raw bytes) BEFORE
// express.json(). Requires CLERK_WEBHOOK_SECRET (Clerk dashboard -> Webhooks).
const { Webhook } = require("svix");
const prisma = require("../config/database");
const env = require("../config/env");

async function clerkWebhook(req, res) {
  if (!env.CLERK_WEBHOOK_SECRET) {
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let evt;
  try {
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
    const payload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
    evt = wh.verify(payload, {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });
  } catch {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  try {
    if (evt.type === "user.created") {
      const email =
        evt.data.email_addresses?.[0]?.email_address || `${evt.data.id}@users.bonza.app`;
      const name = [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || null;
      await prisma.user.upsert({
        where: { id: evt.data.id },
        update: {},
        create: { id: evt.data.id, email, name },
      });
    }

    if (evt.type === "user.deleted") {
      await prisma.user.delete({ where: { id: evt.data.id } }).catch(() => {});
    }
  } catch {
    // Never make Clerk retry on our own DB hiccup for a sync we can self-heal via
    // ensureUser on the next request.
  }

  res.json({ received: true });
}

module.exports = { clerkWebhook };
