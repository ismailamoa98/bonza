// middleware/cors.js — CORS setup.
// Allows the frontend origin (FRONTEND_URL) to call the API with credentials.
const cors = require("cors");
const env = require("../config/env");

module.exports = cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});
