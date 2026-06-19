// utils/ownedOr403.js — Ownership guard for record-by-id endpoints (IDOR defense).
// Returns true when `record` exists and belongs to `userId`. Otherwise it writes
// the appropriate response (404 missing, 403 wrong owner) and returns false, so
// callers do: `if (!ownedOr403(record, req.userId, res)) return;`
function ownedOr403(record, userId, res) {
  if (!record) {
    res.status(404).json({ error: { message: "Not found" } });
    return false;
  }
  if (record.userId !== userId) {
    res.status(403).json({ error: { message: "Forbidden" } });
    return false;
  }
  return true;
}

module.exports = { ownedOr403 };
