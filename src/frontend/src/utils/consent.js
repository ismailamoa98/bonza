// utils/consent.js — cookie-consent state (UK PECR: non-essential cookies need active opt-in). The choice is
// stored in localStorage; strictly-necessary cookies (auth/session) are always on and exempt from consent.
// Other code can gate loading analytics/functional cookies on getConsent() before they run.
const KEY = "bonza_cookie_consent";
export const OPEN_EVENT = "bonza:open-cookie-prefs"; // footer "Privacy settings" dispatches this
export const CHANGED_EVENT = "bonza:consent-changed";

// Returns the stored record, or null if the visitor hasn't chosen yet (→ show the banner).
export function getConsent() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || "null");
    return r && r.v === 1 ? r : null;
  } catch {
    return null;
  }
}

// Persist a choice. `necessary` is always true. Broadcasts so listeners can react (e.g. load/stop analytics).
export function saveConsent(prefs) {
  const rec = { v: 1, necessary: true, functional: !!prefs.functional, analytics: !!prefs.analytics, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    /* private mode / storage blocked — the banner will simply reappear next load */
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: rec }));
  } catch {
    /* no-op */
  }
  return rec;
}

// Reopen the preferences modal (from the footer "Privacy settings" link).
export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
