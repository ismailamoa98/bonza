// index.js — backend entry: load secrets (prod/staging) before any app module, then listen.
const { loadProductionSecrets } = require("./config/loadSecrets");

async function main() {
  await loadProductionSecrets();

  const app = require("./server");
  const env = require("./config/env");
  const { logger } = require("./utils/logger");

  app.listen(env.PORT, () => {
    logger.info(`Bonza backend listening on http://localhost:${env.PORT}`, { env: env.NODE_ENV });
  });
}

main().catch((err) => {
  console.error("[startup] fatal:", err.message);
  process.exit(1);
});
