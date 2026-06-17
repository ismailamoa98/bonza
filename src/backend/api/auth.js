// api/auth.js — Authentication endpoints.
// POST /api/v1/auth/register — create a user (bcrypt-hashed password) + issue a JWT.
// POST /api/v1/auth/login    — verify credentials + issue a JWT.
// GET  /api/v1/auth/me       — return the current user (behind the auth middleware).
// Mounted UNAUTHENTICATED in server.js; /me applies the auth middleware itself.
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/database");
const env = require("../config/env");
const auth = require("../middleware/auth");

const router = express.Router();

const TOKEN_TTL = "7d";
const BCRYPT_ROUNDS = 10;

// Shape sent to the client — never includes passwordHash.
const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  location: u.location,
  travelStatus: u.travelStatus,
});

const signToken = (userId) => jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: TOKEN_TTL });

const badRequest = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

// POST /register — { email, password, name?, location? } -> { token, user }
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name, location } = req.body || {};
    if (!email || !password) throw badRequest("email and password are required");
    if (String(password).length < 6) throw badRequest("password must be at least 6 characters");

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      const err = new Error("An account with that email already exists");
      err.status = 409;
      throw err;
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(String(password), BCRYPT_ROUNDS),
        name: name || null,
        location: location || null,
      },
    });

    res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /login — { email, password } -> { token, user }
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw badRequest("email and password are required");

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });
    // Generic message — don't reveal whether the email exists.
    const invalid = new Error("Incorrect email or password");
    invalid.status = 401;
    if (!user) throw invalid;

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) throw invalid;

    res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /me — current user (auth middleware sets req.userId; dev falls back to demo user).
router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
