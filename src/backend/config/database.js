// config/database.js — PostgreSQL connection.
// Exports a singleton Prisma client used across the backend. Reusing one
// instance avoids exhausting the connection pool during dev hot-reloads.
//
// §27b: non-money measures (ratios, review scores, cents-per-point, lat/lon) are `Decimal` in the schema so
// the "no Float" rule is absolute. Prisma returns `Decimal` as Decimal.js objects, which coerce unreliably
// in JS arithmetic/comparison and JSON-serialize as strings. Rather than sprinkle `.toNumber()` across every
// read site (miss-prone — the exact silent bug §27b fights), we convert Decimal → Number once, on read, via a
// query extension. Money is `Int` minor units (never Decimal), so it is unaffected. No Decimal-bearing model
// is read through raw SQL, so wrapping ORM operations is sufficient.
const { PrismaClient, Prisma } = require("@prisma/client");

function decimalsToNumbers(value) {
  if (value == null || typeof value !== "object") return value;
  if (Prisma.Decimal.isDecimal(value)) return value.toNumber();
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) value[i] = decimalsToNumbers(value[i]);
    return value;
  }
  for (const k of Object.keys(value)) value[k] = decimalsToNumbers(value[k]);
  return value;
}

const prisma =
  global.__bonzaPrisma ||
  new PrismaClient().$extends({
    query: {
      async $allOperations({ args, query }) {
        return decimalsToNumbers(await query(args));
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.__bonzaPrisma = prisma;
}

module.exports = prisma;
