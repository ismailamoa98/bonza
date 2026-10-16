// services/dataExport.js — Phase 25 §25e. Assembles a user's personal data into a zip for a DSAR export.
// Offline (no S3 bucket) the zip is written to a temp path and logged; with a bucket + AWS creds it is
// uploaded and a 72h signed URL returned. The AWS SDK is required lazily so the offline build needs no new
// dependency. The raw statement email bodies are never persisted and so are never in the export.
const fs = require("fs");
const os = require("os");
const path = require("path");
const prisma = require("../config/database");
const env = require("../config/env");
const { createZip } = require("../utils/zip");
const { getHistory } = require("./legalAcceptance");
const { logger } = require("../utils/logger");

const EXPORT_TTL_SECONDS = 72 * 60 * 60;

// --- CSV helpers -----------------------------------------------------------
function csvCell(v) {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(columns, rows) {
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(",")).join("\n");
  return `${header}\n${body}${rows.length ? "\n" : ""}`;
}

// --- Assemble the export file map ------------------------------------------
async function assembleExport(userId) {
  const [user, loyalty, bookings, credits, events, tickets, legal] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.loyaltyAccount.findMany({ where: { userId } }),
    prisma.booking.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.bonzaCredit.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.userEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.supportTicket.findMany({ where: { userId }, include: { messages: true }, orderBy: { createdAt: "asc" } }),
    getHistory(userId),
  ]);

  if (!user) throw new Error("User not found");

  // profile.json — the account record, minus secrets (never export OAuth refresh tokens).
  const { gmailRefreshToken: _gmail, outlookRefreshToken: _outlook, ...safeUser } = user;
  const profile = {
    ...safeUser,
    gmailConnected: user.gmailConnected,
    outlookConnected: user.outlookConnected,
    _note: "OAuth refresh tokens are intentionally excluded from exports.",
  };

  const files = {
    "profile.json": JSON.stringify(profile, null, 2),
    "loyalty.csv": toCsv(
      ["programme", "accountNumber", "balance", "statusTier", "syncMethod", "syncState", "statementDate", "pointsExpireAt", "manualOverrideAt", "lastSynced"],
      loyalty
    ),
    "bookings.csv": toCsv(
      ["id", "leg", "bookingType", "supplier", "origin", "destination", "checkIn", "checkOut", "description", "cashValueGbp", "pointsUsed", "pointsProgramme", "status", "confirmedAt", "creditsAwarded"],
      bookings
    ),
    "credits.csv": toCsv(["id", "amount", "source", "bookingId", "createdAt", "expiresAt"], credits),
    "events.csv": toCsv(["type", "metadata", "sessionId", "createdAt"], events),
    "support.csv": toCsv(
      ["reference", "urgency", "category", "subject", "message", "status", "bookingId", "createdAt", "resolvedAt"],
      tickets
    ),
    "support_messages.csv": toCsv(
      ["ticketReference", "author", "body", "isInternal", "createdAt"],
      tickets.flatMap((t) => (t.messages || []).map((m) => ({ ticketReference: t.reference, author: m.author, body: m.body, isInternal: m.isInternal, createdAt: m.createdAt })))
    ),
    "legal.csv": toCsv(["document", "version", "acceptedAt", "context", "isCurrent"], legal),
    "README.txt": readme(),
  };
  return files;
}

function readme() {
  return [
    "Your Bonza data export",
    "======================",
    "",
    "This archive contains the personal data we hold about you.",
    "",
    "profile.json          Your account profile (OAuth tokens excluded).",
    "loyalty.csv           Your loyalty programmes and balances (inferred from statements or entered manually).",
    "bookings.csv          Bookings made through Bonza.",
    "credits.csv           Your Bonza Credits ledger.",
    "events.csv            Product activity log (searches, optimisations, bookings).",
    "support.csv           Support tickets you have raised.",
    "support_messages.csv  Messages on those tickets (internal agent notes excluded from your view are marked).",
    "legal.csv             Which legal document versions you accepted, and when.",
    "",
    "Note: completed financial records (bookings, credits) are retained for 7 years for UK tax law even after",
    "account deletion, with personal fields pseudonymised. See https://bonza.app/legal/privacy.",
    "",
    `Generated ${new Date().toISOString()}.`,
  ].join("\n");
}

// --- Delivery --------------------------------------------------------------
async function uploadToS3(key, buf) {
  // Lazy require so the offline build needs no @aws-sdk dependency.
  const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
  const s3 = new S3Client({ region: env.AWS_REGION });
  await s3.send(new PutObjectCommand({ Bucket: env.S3_EXPORT_BUCKET, Key: key, Body: buf, ContentType: "application/zip" }));
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: env.S3_EXPORT_BUCKET, Key: key }), { expiresIn: EXPORT_TTL_SECONDS });
}

// Build the export, deliver it, and return { mode, url?, path?, expiresAt }.
async function createExport(userId) {
  const files = await assembleExport(userId);
  const zip = createZip(files);
  const key = `exports/${userId}/bonza-export-${Date.now()}.zip`;
  const expiresAt = new Date(Date.now() + EXPORT_TTL_SECONDS * 1000);

  if (env.hasS3Export) {
    const url = await uploadToS3(key, zip);
    return { mode: "s3", url, expiresAt };
  }

  // Offline: write to a temp dir and log the path (no signed URL).
  const dir = path.join(os.tmpdir(), "bonza-exports");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, path.basename(key));
  fs.writeFileSync(out, zip);
  logger.info(`[dataExport] export written locally (offline, no S3): ${out}`);
  return { mode: "local", path: out, expiresAt };
}

module.exports = { assembleExport, createExport, toCsv, EXPORT_TTL_SECONDS };
