// config/runMigrations.js — prisma migrate deploy on startup in prod/staging (no-op in dev); fatal on failure.
const { execSync } = require("child_process");

async function runMigrations() {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== "production" && nodeEnv !== "staging") return; // dev uses docker compose + db push

  try {
    console.log("[migrations] running prisma migrate deploy...");
    execSync("npx prisma migrate deploy --schema=src/backend/db/schema.prisma", { stdio: "inherit" });
    console.log("[migrations] complete");
  } catch (err) {
    console.error("[migrations] failed:", err.message);
    throw err; // fatal — don't start with an out-of-date schema
  }
}

module.exports = { runMigrations };
