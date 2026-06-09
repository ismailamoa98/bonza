// server.js — Express server entry point.
// Wires up middleware (CORS, JSON, auth) and mounts the 6 Phase 2 API
// endpoints, then starts listening on PORT (default 5000).
const express = require("express");

const env = require("./config/env");
const corsMiddleware = require("./middleware/cors");
const auth = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/errorHandler");

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
app.use(express.json());

// Health check (unauthenticated).
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "bonza-backend", env: env.NODE_ENV });
});

// Reference lookup / browse inventory — no auth needed.
app.use("/api/v1/airports", airportsRouter); // GET /api/v1/airports?q=
app.use("/api/v1/hotels", hotelsRouter); // GET /api/v1/hotels?destination=&…
app.use("/api/v1/flights", flightsRouter); // GET /api/v1/flights?from=&to=&…
app.use("/api/v1/cars", carsRouter); // GET /api/v1/cars?location=&…

// All API routes require auth (dev requests fall back to the seeded user).
app.use("/api/v1/trips", auth, tripsRouter); // POST /api/v1/trips
app.use("/api/v1/user", auth, plaidRouter); // GET  /api/v1/user/loyalty-points
app.use("/api/v1/optimize", auth, optimizeRouter); // POST /api/v1/optimize
app.use("/api/v1/chat", auth, chatRouter); // POST /api/v1/chat
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
