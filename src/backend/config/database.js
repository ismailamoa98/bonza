// config/database.js — PostgreSQL connection.
// Exports a singleton Prisma client used across the backend. Reusing one
// instance avoids exhausting the connection pool during dev hot-reloads.
const { PrismaClient } = require("@prisma/client");

const prisma = global.__bonzaPrisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__bonzaPrisma = prisma;
}

module.exports = prisma;
