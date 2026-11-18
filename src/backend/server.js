
require("./instrument");

const express = require("express");
const { clerkMiddleware } = require("@clerk/express");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit"); // IPv6-safe IP key helper (v8)
const { PrismaRateLimitStore } = require("./utils/rateLimitStore"); // §27d — shared cross-instance store

const env = require("./config/env");
const corsMiddleware = require("./middleware/cors");
const { requestId } = require("./middleware/requestId"); // §27i — correlation id → AsyncLocalStorage
const auth = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const { clerkWebhook } = require("./api/webhooks");
const tripsRouter = require("./api/trips");
const airportsRouter = require("./api/airports");
const fxRouter = require("./api/fx");
const hotelsRouter = require("./api/hotels");
const flightsRouter = require("./api/flights");
const carsRouter = require("./api/cars");
const plaidRouter = require("./api/plaid");
const profileRouter = require("./api/profile");
const meRouter = require("./api/me");
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
const searchRouter = require("./api/search");
const pointsRouter = require("./api/points");
const destinationsRouter = require("./api/destinations");
const exploreRouter = require("./api/explore");
const priceCalendarRouter = require("./api/priceCalendar");
const helpRouter = require("./api/help");
const supportRouter = require("./api/support");
const statusRouter = require("./api/status");
const adminRouter = require("./api/admin");
const securityRouter = require("./api/security"); // §27d — Turnstile verify (public, signup pre-gate)
const reviewsRouter = require("./api/reviews");
const { router: notificationsRouter, unsubscribe } = require("./api/notifications");
const { affiliateWebhook } = require("./api/webhooks");
const { oauthCallback } = require("./api/oauthCallback");

const app = express();

app.use(corsMiddleware);

// §27i — open the correlation context first, so every request (webhooks + json routes alike) runs inside an
// AsyncLocalStorage holding its request_id. Everything downstream — logs, Sentry, outbound headers — inherits it.
app.use(requestId);

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

// Phase 24 §24i — under the proxied /api/v1 path so the frontend offline heartbeat (HEAD) can reach it.
app.all("/api/v1/health", (req, res) => res.status(200).end());

app.use(clerkMiddleware());

// §27d — every limiter is backed by the shared Postgres store (not the per-process memory default), so the
// limit is real across instances. Each gets its own prefix so keys don't collide in the one table.
const store = (prefix) => new PrismaRateLimitStore({ prefix });

const optimizeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  store: store("optimize"),
  message: { error: { message: "Rate limit reached — please wait before optimising again" } },
});
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  store: store("chat"),
  message: { error: { message: "Too many messages — slow down" } },
});

const userKey = (req) => req.userId || ipKeyGenerator(req.ip);
const ipKey = (req) => ipKeyGenerator(req.ip);

const loyaltySyncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: userKey,
  store: store("loyalty_sync"),
  message: { error: { message: "Sync rate limit reached — balances update automatically each night" } },
});
const recsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  keyGenerator: userKey,
  store: store("recs"),
  message: { error: { message: "Too many recommendation refreshes — please wait a moment" } },
});
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60,
  keyGenerator: userKey,
  store: store("search"),
  message: { error: { message: "Too many searches — please wait a moment" } },
});
const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: userKey,
  store: store("onboarding"),
  skip: (req) => req.body?.onboardingComplete !== true,
  message: { error: { message: "Too many onboarding attempts — please wait before retrying" } },
});
const manualLoyaltyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: userKey,
  store: store("manual_loyalty"),
  message: { error: { message: "Too many manual updates — please wait before adding more" } },
});
const bookingsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: userKey,
  store: store("bookings"),
  message: { error: { message: "Too many booking requests — please wait a moment" } },
});

// Phase 22 — support assistant: 20 messages per hour per user (the escalation path is a separate ticket flow).
const assistantLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: userKey,
  store: store("assistant"),
  message: { error: { message: "You've reached the assistant limit for this hour — email a human and we'll help." } },
});

// §27d — a generous global per-IP ceiling across the whole API (crude-flood guard), and a tighter per-IP
// limiter for the public (unauthenticated) data endpoints so the open pages can't be hammered. The country/
// city/explore pages themselves stay open + edge-cached (documented Cloudflare rule); this is the API ceiling.
const globalIpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  keyGenerator: ipKey,
  store: store("ip_global"),
  message: { error: { message: "Too many requests — please slow down." } },
});
const publicDataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  keyGenerator: ipKey,
  store: store("ip_public"),
  message: { error: { message: "Too many requests — please slow down." } },
});

// §27d — the global per-IP ceiling guards every API route mounted below (webhooks + /health are mounted
// above and intentionally exempt). The stricter publicDataLimiter is layered onto the unauthenticated data
// routers so the open pages can't be hammered.
app.use("/api/v1", globalIpLimiter);

app.use("/api/v1/airports", airportsRouter); // GET /api/v1/airports?q=
app.use("/api/v1/fx", fxRouter); // GET /api/v1/fx → GBP display rates (public)
app.use("/api/v1/security", securityRouter); // §27d — POST /turnstile/verify (public, signup pre-gate)
app.use("/api/v1/destinations", publicDataLimiter, destinationsRouter); // GET /hero → hero board (public; affordability if signed in)
app.use("/api/v1/explore", publicDataLimiter, exploreRouter); // GET / → Explore Everywhere map/list/grid data (public)
app.use("/api/v1/price-calendar", publicDataLimiter, priceCalendarRouter); // GET / → per-day fares + award flags (public)
app.use("/api/v1/help", publicDataLimiter, helpRouter); // Phase 22 — help centre: categories/search/articles (public)
app.use("/api/v1/status", publicDataLimiter, statusRouter); // Phase 22 — service status (public, cached 30s)
app.use("/api/v1/hotels", hotelsRouter); // GET /api/v1/hotels?destination=&…
app.use("/api/v1/flights", flightsRouter); // GET /api/v1/flights?from=&to=&…
app.use("/api/v1/cars", carsRouter); // GET /api/v1/cars?location=&…

app.patch("/api/v1/user/profile", auth, onboardingLimiter); // only counts onboardingComplete flips
app.post(["/api/v1/loyalty/sync-now", "/api/v1/loyalty/sync-email"], auth, loyaltySyncLimiter);
app.post("/api/v1/loyalty/accounts", auth, manualLoyaltyLimiter); // manual entry (DB write)

app.use("/api/v1/trips", auth, tripsRouter); // POST /api/v1/trips
app.use("/api/v1/user", auth, plaidRouter); // GET  /api/v1/user/loyalty-points
app.use("/api/v1/user", auth, profileRouter); // GET/PATCH /api/v1/user/profile
app.use("/api/v1/me", auth, meRouter); // Phase 25 — legal acceptance (§25d) + DSAR export/delete (§25e)
app.use("/api/v1/optimize", optimizeLimiter, auth, optimizeRouter); // POST /api/v1/optimize
app.use("/api/v1/chat", chatLimiter, auth, chatRouter); // POST /api/v1/chat
app.use("/api/v1/loyalty", auth, loyaltyRouter); // POST /sync-email · GET /accounts
app.use("/api/v1/subscriptions", auth, subscriptionsRouter); // POST /create · /cancel · GET /status
app.use("/api/v1/credits", auth, creditsRouter); // GET / · POST /redeem
app.use("/api/v1/bookings", auth, bookingsLimiter, bookingsRouter); // POST / · GET / (history)
app.use("/api/v1/affiliate", auth, affiliateRouter); // POST /click (outbound tracking)
app.use("/api/v1/journeys", auth, journeysRouter); // POST /confirm-booking · /confirm-transfer
app.use("/api/v1/recommendations", auth, recsLimiter, recommendationsRouter); // GET / (personalised packages)
app.use("/api/v1/search", auth, searchLimiter, searchRouter); // POST / — unified cash + points search
app.use("/api/v1/points", auth, pointsRouter); // GET /portfolio · /programme/:accountId (Phase 14)
app.use("/api/v1/reviews", auth, reviewsRouter); // GET / — genuine property reviews (Google Places)
app.use("/api/v1/notifications", auth, notificationsRouter); // GET / · read-all · dismiss · preferences
// Phase 22 — support: rate-limit the assistant (auth so the limit keys per user), then the self-authorising
// support router (tickets optionalAuth, assistant/own-tickets auth, programme-contact public) and admin.
app.post("/api/v1/support/assistant", auth, assistantLimiter);
app.use("/api/v1/support", supportRouter);
app.use("/api/v1/admin", adminRouter); // requireAdmin inside the router

app.use("/api/v1", auth, inventoryRouter); // POST /flights/search · /flights/confirm-price · /hotels/search
app.use("/api/v1", auth, bookingRouter); // POST /api/v1/create-booking-link
app.use("/api/v1", auth, conversionRouter); // POST /api/v1/conversion

app.use(notFound);
app.use(errorHandler);

module.exports = app;
