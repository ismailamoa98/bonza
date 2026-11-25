// scripts/set-db-role-passwords.js — Phase 27 §27h/§27g go-live cutover. Sets the login passwords for the
// least-privilege DB roles (bonza_app / bonza_migrate / bonza_readonly) from their Secrets Manager secrets, so
// the app can connect as `bonza_app` (deploy with `-c dbRole=bonza_app`) instead of the master user. The roles
// themselves are created password-less by the §27h migration; this is the one-time step that activates them.
//
// Run ONCE at go-live (and whenever a role secret is rotated), connected as the master user:
//   DATABASE_URL="postgresql://bonza:<master-pw>@<host>:5432/bonza?sslmode=require" \
//   BONZA_ENV=production AWS_REGION=eu-west-2 node scripts/set-db-role-passwords.js
//
// Idempotent: ALTER ROLE ... WITH PASSWORD just resets the password. Safe because the role names are fixed
// constants and the generated passwords are punctuation-free (the secrets use excludePunctuation), so the
// dollar-quoted literal below can't be broken out of.
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { PrismaClient } = require("@prisma/client");

const ROLES = ["bonza_app", "bonza_migrate", "bonza_readonly"];
const ENV = process.env.BONZA_ENV || process.env.NODE_ENV || "production";
const REGION = process.env.AWS_REGION || "eu-west-2";

async function getSecret(sm, name) {
  const res = await sm.send(new GetSecretValueCommand({ SecretId: name }));
  return JSON.parse(res.SecretString);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL (master connection) is required");
  const sm = new SecretsManagerClient({ region: REGION });
  const prisma = new PrismaClient();

  try {
    for (const role of ROLES) {
      const secretName = `/bonza/${ENV}/db-${role}`;
      const { username, password } = await getSecret(sm, secretName);
      if (username !== role) throw new Error(`secret ${secretName} username '${username}' != role '${role}'`);
      if (/[$'\\]/.test(password)) throw new Error(`refusing: password for ${role} contains quoting chars`);

      // EXECUTE format(%I, %L) quotes the identifier + literal safely server-side; the password travels in a
      // dollar-quoted literal (guarded above) so it never terminates the statement.
      await prisma.$executeRawUnsafe(
        `DO $do$ BEGIN EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '${role}', $pw$${password}$pw$); END $do$;`
      );
      console.log(`[set-db-role-passwords] set password for ${role} (from ${secretName})`);
    }
    console.log("[set-db-role-passwords] done. Deploy the app with -c dbRole=bonza_app to cut over.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[set-db-role-passwords] failed:", err.message);
  process.exit(1);
});
