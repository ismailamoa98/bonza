// services/paymentService.js — Stripe PaymentIntent for cash bookings (mock_pi_* offline).
const env = require("../config/env");

function getStripe() {
  const Stripe = require("stripe");
  return new Stripe(env.STRIPE_SECRET_KEY);
}

const isMockIntent = (id) => typeof id === "string" && id.startsWith("mock_pi_");

const toPence = (gbp) => Math.round(Number(gbp) * 100);

async function createBookingPaymentIntent({ userId, amountGbp, metadata = {} }) {
  const amount = toPence(amountGbp);
  if (!amount || amount < 1) {
    const err = new Error("amountGbp must be a positive amount");
    err.status = 400;
    throw err;
  }

  if (!env.hasStripe) {
    const id = `mock_pi_${userId}_${amount}`;
    return { paymentIntentId: id, clientSecret: `${id}_secret_mock`, mock: true };
  }

  const intent = await getStripe().paymentIntents.create({
    amount,
    currency: "gbp",
    automatic_payment_methods: { enabled: true },
    metadata: { bonzaUserId: userId, kind: "booking", ...metadata },
  });
  return { paymentIntentId: intent.id, clientSecret: intent.client_secret, mock: false };
}

async function retrievePaymentIntent(paymentIntentId) {
  if (!paymentIntentId) {
    const err = new Error("paymentIntentId is required");
    err.status = 400;
    throw err;
  }
  if (!env.hasStripe || isMockIntent(paymentIntentId)) {
    return { id: paymentIntentId, status: "succeeded", mock: true };
  }
  const intent = await getStripe().paymentIntents.retrieve(paymentIntentId);
  return { id: intent.id, status: intent.status, amount: intent.amount, mock: false };
}

module.exports = { createBookingPaymentIntent, retrievePaymentIntent, isMockIntent };
