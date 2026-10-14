// utils/ownedOr403.js — Ownership guard for record-by-id endpoints (IDOR defense).
// Returns true when `record` exists and belongs to `userId`. Otherwise it writes
// the appropriate response (404 missing, 403 wrong owner) and returns false, so
// callers do: `if (!ownedOr403(record, req.userId, res)) return;`
const { sendError } = require("./AppError");

function ownedOr403(record, userId, res) {
  if (!record) {
    sendError(res, "NOT_FOUND", { message: "Not found" });
    return false;
  }
  if (record.userId !== userId) {
    sendError(res, "FORBIDDEN", { message: "Forbidden" });
    return false;
  }
  return true;
}

module.exports = { ownedOr403 };
