// config/loadSecrets.js — loads secrets from AWS Secrets Manager in prod/staging (no-op offline).
async function loadProductionSecrets() {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== "production" && nodeEnv !== "staging") return;

  const secretArn = process.env.APP_SECRETS_ARN;
  if (!secretArn) {
    console.warn("[secrets] APP_SECRETS_ARN not set — using environment variables");
    return;
  }

  const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION || "eu-west-2" });

  try {
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
    const secrets = JSON.parse(response.SecretString);
    Object.assign(process.env, secrets);
    console.log(`[secrets] loaded ${Object.keys(secrets).length} keys from Secrets Manager`);
  } catch (err) {
    console.error("[secrets] failed to load from Secrets Manager:", err.message);
    throw err; // fatal — don't start without secrets
  }
}

module.exports = { loadProductionSecrets };
