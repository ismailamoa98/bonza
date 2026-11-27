// config/legal.js — Phase 25 §25c/§25d. The backend's view of the legal document set: the current version of
// each document (kept in step with the frontend registry src/frontend/src/content/legal/index.js), and which
// documents are "material" — a version bump on a material doc forces a re-acceptance interstitial, while other
// changes only send a notice email. Default material = anything touching liability, payment, credits or the
// points-agency clause.
const LEGAL_CURRENT_VERSIONS = {
  privacy: "2026-11-01",
  terms: "2026-11-01",
  cookies: "2026-11-01",
  "acceptable-use": "2026-11-01",
  subprocessors: "2026-11-01",
  "booking-terms": "2026-11-01",
  "pro-terms": "2026-11-01",
};

// Recorded at signup as the affirmative act of creating an account.
const SIGNUP_DOCS = ["terms", "privacy"];

// A new version of any of these requires explicit re-acceptance at next login.
const MATERIAL_DOCS = ["terms", "privacy", "booking-terms"];

const currentVersion = (doc) => LEGAL_CURRENT_VERSIONS[doc] || null;

module.exports = { LEGAL_CURRENT_VERSIONS, SIGNUP_DOCS, MATERIAL_DOCS, currentVersion };
