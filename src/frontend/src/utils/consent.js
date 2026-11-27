// utils/consent.js — cookie-consent state (UK PECR: non-essential cookies need active opt-in). The choice is
// stored in localStorage; strictly-necessary cookies (auth/session) are always on and exempt from consent.
// Other code can gate loading analytics/functional cookies on getConsent() before they run.
const KEY = "bonza_cookie_consent";
const TTL_DAYS = 365; // §25b — lapse after a year so consent is re-asked, not assumed indefinitely
export const OPEN_EVENT = "bonza:open-cookie-prefs"; // footer "Privacy settings" dispatches this
export const CHANGED_EVENT = "bonza:consent-changed";
export const CATEGORIES = ["necessary", "analytics", "marketing"];

// Returns the stored record, or null if the visitor hasn't chosen yet / the choice has lapsed (→ show banner).
export function getConsent() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!r || r.v !== 1) return null;
    if (r.expiresAt && Date.now() > r.expiresAt) return null; // lapsed → re-ask
    return r;
  } catch {
    return null;
  }
}

// Persist a choice. `necessary` is always true. Broadcasts so listeners can react (e.g. load/stop analytics).
export function saveConsent(prefs) {
  const rec = {
    v: 1,
    necessary: true,
    functional: !!prefs.functional,
    analytics: !!prefs.analytics,
    marketing: !!prefs.marketing,
    at: new Date().toISOString(),
    expiresAt: Date.now() + TTL_DAYS * 864e5,
  };
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

// Phase 24 §24a / Phase 25 §25b — non-essential categories load only on an explicit opt-in.
export function hasAnalyticsConsent() {
  return getConsent()?.analytics === true;
}
export function hasMarketingConsent() {
  return getConsent()?.marketing === true;
}
