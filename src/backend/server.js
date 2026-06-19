// server.js — Express server entry point.
// Wires up middleware (CORS, Clerk, JSON, auth, rate limiting) and mounts the
// API endpoints, then starts listening on PORT (default 5000).
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

const app = express();

app.use(corsMiddleware);

// Clerk webhook needs the RAW request body for svix signature verification, so it
// is mounted BEFORE express.json() parses bodies.
app.post(
  "/api/v1/webhooks/clerk",
  express.raw({ type: "application/json" }),
  clerkWebhook
);

app.use(express.json());

// Health check — unauthenticated, and kept ahead of Clerk so it answers even if
// Clerk keys are missing/misconfigured.
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "bonza-backend", env: env.NODE_ENV });
});

// Populates the Clerk session on req so getAuth() works in the auth middleware.
app.use(clerkMiddleware());

// Rate limits — protect the Claude-backed endpoints (and future API cost).
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

// Reference lookup / browse inventory — no auth needed.
app.use("/api/v1/airports", airportsRouter); // GET /api/v1/airports?q=
app.use("/api/v1/hotels", hotelsRouter); // GET /api/v1/hotels?destination=&…
app.use("/api/v1/flights", flightsRouter); // GET /api/v1/flights?from=&to=&…
app.use("/api/v1/cars", carsRouter); // GET /api/v1/cars?location=&…

// All API routes require auth (dev requests fall back to the seeded user).
app.use("/api/v1/trips", auth, tripsRouter); // POST /api/v1/trips
app.use("/api/v1/user", auth, plaidRouter); // GET  /api/v1/user/loyalty-points
app.use("/api/v1/optimize", optimizeLimiter, auth, optimizeRouter); // POST /api/v1/optimize
app.use("/api/v1/chat", chatLimiter, auth, chatRouter); // POST /api/v1/chat
app.use("/api/v1", auth, bookingRouter); // POST /api/v1/create-booking-link
app.use("/api/v1", auth, conversionRouter); // POST /api/v1/conversion

app.use(notFound);
app.use(errorHandler);

// Only listen when run directly (not when imported by tests).
if (require.main === module) {
  app.listen(env.PORT, () => {
    console.log(`Bonza backend listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

module.exports = app;
