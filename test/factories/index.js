// test/factories/index.js — Phase 23. Deterministic-but-unique test data on the real schema (via config/database).
// Functions, not fixed objects, so no test mutates another's data. NOTE: User.id IS the Clerk id (no clerkId field).
const { randomUUID } = require("crypto");
const prisma = require("../../src/backend/config/database");

async function makeUser(overrides = {}) {
  const id = overrides.id || `user_${randomUUID()}`;
  return prisma.user.create({
    data: {
      id,
      email: overrides.email || `${randomUUID()}@test.bonza`,
      name: "Test User",
      homeAirport: "LHR",
      travelStyle: "points_max",
      onboardingComplete: true,
      ...overrides,
    },
  });
}

async function makeProUser(overrides = {}) {
  const user = await makeUser(overrides);
  await prisma.subscription.create({
    data: {
      userId: user.id,
      status: "active",
      plan: "pro_annual",
      stripeCustomerId: `cus_${randomUUID()}`,
      stripeSubscriptionId: `sub_${randomUUID()}`,
      currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
    },
  });
  return user;
}

async function makeLoyaltyAccount(userId, overrides = {}) {
  return prisma.loyaltyAccount.create({
    data: {
      userId,
      programme: "ba_avios",
      balance: 25000,
      valueGbp: 275,
      syncState: "verified",
      lastSynced: new Date(),
      syncMethod: "email_parse",
      ...overrides,
    },
  });
}

async function makeBooking(userId, overrides = {}) {
  return prisma.booking.create({
    data: {
      userId,
      leg: "flight",
      bookingType: "cash",
      supplier: "duffel",
      supplierReference: "ABC123",
      description: "LHR → LIS return",
      cashValueGbp: 280,
      serviceFeeGbp: 8.4,
      confirmedAt: new Date(),
      confirmationMethod: "duffel",
      status: "confirmed",
      ...overrides,
    },
  });
}

// A credit ledger row. amount may be negative (a redemption). Defaults to a 24-month expiry.
async function makeCredit(userId, overrides = {}) {
  return prisma.bonzaCredit.create({
    data: {
      userId,
      amount: 10,
      source: "cashback_hotel",
      expiresAt: new Date(Date.now() + 24 * 30 * 86400000),
      ...overrides,
    },
  });
}

module.exports = { makeUser, makeProUser, makeLoyaltyAccount, makeBooking, makeCredit, prisma };
