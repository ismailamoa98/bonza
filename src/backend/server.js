const express = require("express");
const { clerkMiddleware } = require("@clerk/express");
const rateLimit = require("express-rate-limit");

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

// Affiliate postback — public server-to-server JSON (no Clerk session).
app.post("/api/v1/webhooks/affiliate", affiliateWebhook);

// Public one-click unsubscribe (recipient may not be signed in).
app.get("/api/v1/notifications/unsubscribe", unsubscribe);

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

app.use("/api/v1/airports", airportsRouter); // GET /api/v1/airports?q=
app.use("/api/v1/hotels", hotelsRouter); // GET /api/v1/hotels?destination=&…
app.use("/api/v1/flights", flightsRouter); // GET /api/v1/flights?from=&to=&…
app.use("/api/v1/cars", carsRouter); // GET /api/v1/cars?location=&…

app.use("/api/v1/trips", auth, tripsRouter); // POST /api/v1/trips
app.use("/api/v1/user", auth, plaidRouter); // GET  /api/v1/user/loyalty-points
app.use("/api/v1/optimize", optimizeLimiter, auth, optimizeRouter); // POST /api/v1/optimize
app.use("/api/v1/chat", chatLimiter, auth, chatRouter); // POST /api/v1/chat
app.use("/api/v1/loyalty", auth, loyaltyRouter);
app.use("/api/v1/subscriptions", auth, subscriptionsRouter);
app.use("/api/v1/credits", auth, creditsRouter);
app.use("/api/v1/bookings", auth, bookingsRouter);
app.use("/api/v1/affiliate", auth, affiliateRouter);
app.use("/api/v1/journeys", auth, journeysRouter);
app.use("/api/v1/recommendations", auth, recommendationsRouter);
app.use("/api/v1/notifications", auth, notificationsRouter);
app.use("/api/v1", auth, inventoryRouter);
app.use("/api/v1", auth, bookingRouter); // POST /api/v1/create-booking-link
app.use("/api/v1", auth, conversionRouter); // POST /api/v1/conversion

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(env.PORT, () => {
    console.log(`Bonza backend listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

module.exports = app;
