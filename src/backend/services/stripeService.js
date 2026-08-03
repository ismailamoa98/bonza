// services/stripeService.js — Stripe Checkout + webhook verify; offline mock flips Pro locally.
const env = require("../config/env");
const prisma = require("../config/database");

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function getStripe() {
  const Stripe = require("stripe");
  return new Stripe(env.STRIPE_SECRET_KEY);
}

async function createSubscription(userId, email) {
  if (!env.hasStripe) return mockCreateSubscription(userId);

  const stripe = getStripe();

  const existing = await prisma.subscription.findUnique({ where: { userId } });
  let customerId = existing?.stripeCustomerId;
  if (!customerId || customerId.startsWith("mock_cus_")) {
    const customer = await stripe.customers.create({ email, metadata: { bonzaUserId: userId } });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: env.STRIPE_PRO_ANNUAL_PRICE_ID, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/dashboard?upgraded=true`,
    cancel_url: `${env.FRONTEND_URL}/dashboard?upgrade=cancelled`,
    client_reference_id: userId,
    metadata: { bonzaUserId: userId },
    subscription_data: { metadata: { bonzaUserId: userId } },
    allow_promotion_codes: true,
  });

  await prisma.subscription.upsert({
    where: { userId },
    update: { stripeCustomerId: customerId, status: "pending" },
    create: { userId, stripeCustomerId: customerId, status: "pending", plan: "pro_annual" },
  });

  return { checkoutUrl: session.url };
}

async function mockCreateSubscription(userId) {
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status: "active",
      plan: "pro_annual",
      stripeSubscriptionId: `mock_sub_${userId}`,
      currentPeriodEnd: new Date(Date.now() + ONE_YEAR_MS),
    },
    create: {
      userId,
      stripeCustomerId: `mock_cus_${userId}`,
      stripeSubscriptionId: `mock_sub_${userId}`,
      status: "active",
      plan: "pro_annual",
      currentPeriodEnd: new Date(Date.now() + ONE_YEAR_MS),
    },
  });
  return { checkoutUrl: `${env.FRONTEND_URL}/dashboard?upgraded=true&mock=1`, mock: true };
}

async function cancelSubscription(userId) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription?.stripeSubscriptionId) throw httpError(404, "No active subscription");

  if (env.hasStripe && !subscription.stripeSubscriptionId.startsWith("mock_sub_")) {
    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  await prisma.subscription.update({ where: { userId }, data: { status: "cancelled" } });
  return { cancelledAtPeriodEnd: true };
}

async function handleWebhook(rawBody, signature) {
  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

  let activatedUserId = null;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.bonzaUserId;
      if (!userId) break;

      let currentPeriodEnd = new Date(Date.now() + ONE_YEAR_MS);
      try {
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          if (sub?.current_period_end) currentPeriodEnd = new Date(sub.current_period_end * 1000);
        }
      } catch {
      }

      await prisma.subscription.update({
        where: { userId },
        data: { stripeSubscriptionId: session.subscription, status: "active", currentPeriodEnd },
      });
      activatedUserId = userId;
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "cancelled", stripeSubscriptionId: null },
      });
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await prisma.subscription.updateMany({
        where: { stripeCustomerId: invoice.customer },
        data: { status: "past_due" },
      });
      break;
    }
    default:
      break;
  }

  return { received: true, activatedUserId };
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { createSubscription, cancelSubscription, handleWebhook };
