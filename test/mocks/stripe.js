// test/mocks/stripe.js — Phase 23. Two concerns, kept separate:
//  (1) WEBHOOK tests sign events with the REAL Stripe lib (no network) — `signedRequest` + event builders.
//  (2) stripeService UNIT tests mock the `stripe` npm package so createSubscription/cancelSubscription
//      run without network — `stripeClientMockFactory`.
// A given test file uses one or the other (mocking the package would also mock the signer).
import { vi } from "vitest";
import Stripe from "stripe";
import request from "supertest";

export const WEBHOOK_SECRET = "whsec_test"; // matches vitest.config.mjs env

// Sign a raw event body with the real lib and POST it to the webhook route.
export function signedRequest(app, event, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return request(app)
    .post("/api/v1/webhooks/stripe")
    .set("Content-Type", "application/json")
    .set("stripe-signature", header)
    .send(payload);
}

// Event builders — the minimal shapes handleWebhook reads (events omit `subscription` so no retrieve call).
export const events = {
  checkoutCompleted: (userId) => ({ type: "checkout.session.completed", data: { object: { client_reference_id: userId } } }),
  subscriptionDeleted: (stripeSubscriptionId) => ({ type: "customer.subscription.deleted", data: { object: { id: stripeSubscriptionId } } }),
  paymentFailed: (stripeCustomerId) => ({ type: "invoice.payment_failed", data: { object: { customer: stripeCustomerId } } }),
};

// (2) A mock `stripe` client for unit tests of stripeService. Covers the calls that service makes.
// Usage (hoisting-safe): vi.mock("stripe", () => stripeClientMock())
export function stripeClientMock(overrides = {}) {
  const client = {
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.test/cs_test_1" }) } },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({ id: "sub_test_1", status: "active", current_period_end: Math.floor(Date.now() / 1000) + 31536000 }),
      update: vi.fn().mockResolvedValue({ id: "sub_test_1", cancel_at_period_end: true }),
      cancel: vi.fn().mockResolvedValue({ id: "sub_test_1", status: "canceled" }),
    },
    customers: { create: vi.fn().mockResolvedValue({ id: "cus_test_1" }) },
    webhooks: { constructEvent: vi.fn() },
    ...overrides,
  };
  // The service does `new Stripe(key)` → return our client from the constructor.
  return () => ({ default: vi.fn(() => client), __client: client });
}
