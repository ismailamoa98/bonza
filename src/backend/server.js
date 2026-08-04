
require("./instrument");

const express = require("express");
const { clerkMiddleware } = require("@clerk/express");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit"); // IPv6-safe IP key helper (v8)

const env = require("./config/env");
const corsMiddleware = require("./middleware/cors");
const auth = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const { clerkWebhook } = require("./api/webhooks");
const tripsRouter = require("./api/trips");
const airportsRouter = require("./api/airports");
const hotelsRouter = require("./api/hotels");
const flightsRouter = require("./api/flights");
const carsRouter = require("./api/cars");
const plaidRouter = require("./api/plaid");
const profileRouter = require("./api/profile");
const optimizeRouter = require("./api/optimize");
const chatRouter = require("./api/chat");
const bookingRouter = require("./api/booking");
const conversionRouter = require("./api/conversion");
const loyaltyRouter = require("./api/loyalty");
const inventoryRouter = require("./api/inventory");
const subscriptionsRouter = require("./api/subscriptions");
const { stripeWebhook } = require("./api/subscriptions");
const creditsRouter = require("./api/credits");
const bookingsRouter = require("./api/bookings");
const affiliateRouter = require("./api/affiliate");
const journeysRouter = require("./api/journeys");
const recommendationsRouter = require("./api/recommendations");
const { router: notificationsRouter, unsubscribe } = require("./api/notifications");
const { affiliateWebhook } = require("./api/webhooks");
const { oauthCallback } = require("./api/oauthCallback");

const app = express();

app.use(corsMiddleware);

app.post(
  "/api/v1/webhooks/clerk",
  express.raw({ type: "application/json" }),
  clerkWebhook
);
app.post(
  "/api/v1/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());

app.post("/api/v1/webhooks/affiliate", affiliateWebhook);

app.get("/api/v1/notifications/unsubscribe", unsubscribe);

app.get("/auth/:provider/callback", oauthCallback);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "bonza-backend", env: env.NODE_ENV });
});

app.use(clerkMiddleware());

const optimizeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: { message: "Rate limit reached — please wait before optimising again" } },
});
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: { message: "Too many messages — slow down" } },
});

const userKey = (req) => req.userId || ipKeyGenerator(req.ip);

const loyaltySyncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: userKey,
  message: { error: { message: "Sync rate limit reached — balances update automatically each night" } },
});
const recsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  keyGenerator: userKey,
  message: { error: { message: "Too many recommendation refreshes — please wait a moment" } },
});
const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: userKey,
  skip: (req) => req.body?.onboardingComplete !== true,
  message: { error: { message: "Too many onboarding attempts — please wait before retrying" } },
});
const manualLoyaltyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: userKey,
  message: { error: { message: "Too many manual updates — please wait before adding more" } },
});
const bookingsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: userKey,
  message: { error: { message: "Too many booking requests — please wait a moment" } },
});

app.use("/api/v1/airports", airportsRouter); // GET /api/v1/airports?q=
app.use("/api/v1/hotels", hotelsRouter); // GET /api/v1/hotels?destination=&…
app.use("/api/v1/flights", flightsRouter); // GET /api/v1/flights?from=&to=&…
app.use("/api/v1/cars", carsRouter); // GET /api/v1/cars?location=&…

app.patch("/api/v1/user/profile", auth, onboardingLimiter); // only counts onboardingComplete flips
app.post(["/api/v1/loyalty/sync-now", "/api/v1/loyalty/sync-email"], auth, loyaltySyncLimiter);
app.post("/api/v1/loyalty/accounts", auth, manualLoyaltyLimiter); // manual entry (DB write)

app.use("/api/v1/trips", auth, tripsRouter); // POST /api/v1/trips
app.use("/api/v1/user", auth, plaidRouter); // GET  /api/v1/user/loyalty-points
app.use("/api/v1/user", auth, profileRouter); // GET/PATCH /api/v1/user/profile
app.use("/api/v1/optimize", optimizeLimiter, auth, optimizeRouter); // POST /api/v1/optimize
app.use("/api/v1/chat", chatLimiter, auth, chatRouter); // POST /api/v1/chat
app.use("/api/v1/loyalty", auth, loyaltyRouter); // POST /sync-email · GET /accounts
app.use("/api/v1/subscriptions", auth, subscriptionsRouter); // POST /create · /cancel · GET /status
app.use("/api/v1/credits", auth, creditsRouter); // GET / · POST /redeem
app.use("/api/v1/bookings", auth, bookingsLimiter, bookingsRouter); // POST / · GET / (history)
app.use("/api/v1/affiliate", auth, affiliateRouter); // POST /click (outbound tracking)
app.use("/api/v1/journeys", auth, journeysRouter); // POST /confirm-booking · /confirm-transfer
app.use("/api/v1/recommendations", auth, recsLimiter, recommendationsRouter); // GET / (personalised packages)
app.use("/api/v1/notifications", auth, notificationsRouter); // GET / · read-all · dismiss · preferences
app.use("/api/v1", auth, inventoryRouter); // POST /flights/search · /flights/confirm-price · /hotels/search
app.use("/api/v1", auth, bookingRouter); // POST /api/v1/create-booking-link
app.use("/api/v1", auth, conversionRouter); // POST /api/v1/conversion

app.use(notFound);
app.use(errorHandler);

module.exports = app;
