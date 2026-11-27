// services/legalAcceptance.js — Phase 25 §25d. Records and reads proof of which legal-document version a user
// accepted. The raw IP is never stored — only sha256(ip + APP_SALT). "Outstanding" = a material document
// (config/legal.MATERIAL_DOCS) whose current version the user has not yet accepted; the frontend ReAcceptGate
// turns that into the one-time interstitial.
const crypto = require("crypto");
const prisma = require("../config/database");
const env = require("../config/env");
const { LEGAL_CURRENT_VERSIONS, SIGNUP_DOCS, MATERIAL_DOCS, currentVersion } = require("../config/legal");

function hashIp(ip) {
  if (!ip) return "unknown";
  return crypto.createHash("sha256").update(`${ip}${env.APP_SALT}`).digest("hex");
}

// Pull a best-effort client IP + UA off an Express request (never throws).
function requestContext(req) {
  if (!req) return { ipHash: "unknown", userAgent: "server" };
  const fwd = (req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = fwd || req.ip || req.socket?.remoteAddress || "";
  return { ipHash: hashIp(ip), userAgent: String(req.headers?.["user-agent"] || "unknown").slice(0, 400) };
}

// Record one acceptance row. `version` defaults to the current version of the document.
async function recordAcceptance({ userId, document, version, ipHash = "unknown", userAgent = "server", context = "signup" }) {
  if (!LEGAL_CURRENT_VERSIONS[document]) return null;
  const resolvedVersion = version || currentVersion(document);
  const row = await prisma.legalAcceptance.create({
    data: { userId, document, version: resolvedVersion, ipHash, userAgent, context },
  });
  // §27k — a consent change is an auditable event. Lazy require to avoid a load-time cycle (requestId
  // middleware → legalAcceptance for hashIp).
  const { recordAudit, ACTIONS } = require("./auditService");
  await recordAudit({ action: ACTIONS.CONSENT_ACCEPTED, subjectUserId: userId, entity: "LegalAcceptance", entityId: row.id, after: { document, version: resolvedVersion, context } });
  return row;
}

// Record the signup docs (terms + privacy) at their current versions, idempotently — skips any the user has
// already accepted at the current version (so re-runs from JIT ensureUser + the webhook don't duplicate).
async function recordSignupAcceptance(userId, req, context = "signup") {
  const { ipHash, userAgent } = requestContext(req);
  const results = [];
  for (const document of SIGNUP_DOCS) {
    const version = currentVersion(document);
    const existing = await prisma.legalAcceptance.findFirst({ where: { userId, document, version } });
    if (existing) continue;
    results.push(await recordAcceptance({ userId, document, version, ipHash, userAgent, context }));
  }
  return results.filter(Boolean);
}

// Full acceptance history, newest first, plus the current version per document.
async function getHistory(userId) {
  const rows = await prisma.legalAcceptance.findMany({
    where: { userId },
    orderBy: { acceptedAt: "desc" },
  });
  return rows.map((r) => ({
    document: r.document,
    version: r.version,
    acceptedAt: r.acceptedAt,
    context: r.context,
    isCurrent: r.version === currentVersion(r.document),
  }));
}

// Material documents whose current version the user has NOT accepted → the re-accept list.
async function getOutstanding(userId) {
  const outstanding = [];
  for (const document of MATERIAL_DOCS) {
    const version = currentVersion(document);
    if (!version) continue;
    const accepted = await prisma.legalAcceptance.findFirst({ where: { userId, document, version } });
    if (!accepted) outstanding.push({ document, version });
  }
  return outstanding;
}

module.exports = { hashIp, requestContext, recordAcceptance, recordSignupAcceptance, getHistory, getOutstanding };
