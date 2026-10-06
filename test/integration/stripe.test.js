// test/integration/stripe.test.js — Phase 23. Stripe webhook handling. Uses the real Stripe lib's
// generateTestHeaderString to produce valid signatures (no network — events omit `subscription` so
// handleWebhook never calls retrieve). Webhooks retry, so a replayed event must stay idempotent.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import { makeUser, prisma } from "../factories/index.js";

const app = require("../../src/backend/server");
const SECRET = "whsec_test"; // matches STRIPE_WEBHOOK_SECRET in vitest.config.mjs

function signed(event) {
  const payload = JSON.stringify(event);
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return request(app).post("/api/v1/webhooks/stripe").set("Content-Type", "application/json").set("stripe-signature", header).send(payload);
}

let user;
beforeEach(async () => {
  user = await makeUser();
  await prisma.subscription.create({ data: { userId: user.id, status: "pending", plan: "pro_annual", stripeCustomerId: "cus_test_1" } });
});

describe("POST /webhooks/stripe", () => {
  it("activates a subscription on checkout.session.completed", async () => {
    const res = await signed({ type: "checkout.session.completed", data: { object: { client_reference_id: user.id } } });
    expect(res.status).toBe(200);
    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    expect(sub.status).toBe("active");
  });

  it("is idempotent — a replayed checkout event does not create a second subscription", async () => {
    const event = { type: "checkout.session.completed", data: { object: { client_reference_id: user.id } } };
    await signed(event);
    await signed(event); // retry
    expect(await prisma.subscription.count({ where: { userId: user.id } })).toBe(1);
  });

  it("sets status cancelled on customer.subscription.deleted", async () => {
    await prisma.subscription.update({ where: { userId: user.id }, data: { stripeSubscriptionId: "sub_test_1", status: "active" } });
    const res = await signed({ type: "customer.subscription.deleted", data: { object: { id: "sub_test_1" } } });
    expect(res.status).toBe(200);
    expect((await prisma.subscription.findUnique({ where: { userId: user.id } })).status).toBe("cancelled");
  });

  it("sets status past_due on invoice.payment_failed", async () => {
    const res = await signed({ type: "invoice.payment_failed", data: { object: { customer: "cus_test_1" } } });
    expect(res.status).toBe(200);
    expect((await prisma.subscription.findUnique({ where: { userId: user.id } })).status).toBe("past_due");
  });

  it("rejects an unsigned webhook with 400", async () => {
    const res = await request(app).post("/api/v1/webhooks/stripe").set("Content-Type", "application/json").send(JSON.stringify({ type: "checkout.session.completed", data: { object: {} } }));
    expect(res.status).toBe(400);
  });
});
