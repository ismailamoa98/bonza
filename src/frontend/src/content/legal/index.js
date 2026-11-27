// content/legal/index.js — Phase 25 §25c. The legal-document registry: each document maps to an ordered
// list of versions (newest first). Documents are versioned Markdown shipped in the repo (code review + a git
// sha per change), not DB rows — so "which terms did I agree to" stays answerable a year later. Raw markdown
// is imported with Vite's `?raw` so it ships in the bundle. Frontmatter (version/effectiveFrom/summary) is
// parsed by utils/frontmatter.js at render time.
import privacy_2026_11_01 from "./privacy/2026-11-01.md?raw";
import terms_2026_11_01 from "./terms/2026-11-01.md?raw";
import cookies_2026_11_01 from "./cookies/2026-11-01.md?raw";
import acceptableUse_2026_11_01 from "./acceptable-use/2026-11-01.md?raw";
import subprocessors_2026_11_01 from "./subprocessors/2026-11-01.md?raw";
import bookingTerms_2026_11_01 from "./booking-terms/2026-11-01.md?raw";
import proTerms_2026_11_01 from "./pro-terms/2026-11-01.md?raw";

// doc slug -> { title, versions: [{ version, raw }] (newest first) }
export const LEGAL_DOCS = {
  privacy: { title: "Privacy Policy", versions: [{ version: "2026-11-01", raw: privacy_2026_11_01 }] },
  terms: { title: "Terms of Service", versions: [{ version: "2026-11-01", raw: terms_2026_11_01 }] },
  cookies: { title: "Cookie Policy", versions: [{ version: "2026-11-01", raw: cookies_2026_11_01 }] },
  "acceptable-use": { title: "Acceptable Use Policy", versions: [{ version: "2026-11-01", raw: acceptableUse_2026_11_01 }] },
  subprocessors: { title: "Sub-processors", versions: [{ version: "2026-11-01", raw: subprocessors_2026_11_01 }] },
  "booking-terms": { title: "Booking Terms", versions: [{ version: "2026-11-01", raw: bookingTerms_2026_11_01 }] },
  "pro-terms": { title: "Bonza Pro Terms", versions: [{ version: "2026-11-01", raw: proTerms_2026_11_01 }] },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCS);

// The current (latest) version entry for a doc.
export function currentVersion(doc) {
  return LEGAL_DOCS[doc]?.versions[0] || null;
}

// A specific historical version.
export function findVersion(doc, version) {
  return LEGAL_DOCS[doc]?.versions.find((v) => v.version === version) || null;
}
