// lib/analytics/index.js — Phase 24 §24a. PostHog, consent-gated, EU cloud. The ONLY file that loads
// posthog-js or calls posthog.capture — everything else goes through track(EV.X, {...}). posthog-js is
// dynamically imported inside initAnalytics so it stays out of the initial bundle and only downloads once
// the visitor has consented and a key is present.
//
// Privacy: never pass email, name, point balances, card numbers, booking references or passenger names to
// track()/identify(). Plan tier, counts and booleans only. Elements rendering a balance / membership number
// / passenger name carry `data-private` so session recording masks them.
import { hasAnalyticsConsent, CHANGED_EVENT } from "../../utils/consent";

let posthog = null;
let ready = false;
let loading = false;
let listening = false;

export async function initAnalytics() {
  if (ready || loading) return;
  if (!import.meta.env.VITE_POSTHOG_KEY) return; // dev / no key: no-op
  if (!hasAnalyticsConsent()) {
    armConsentListener(); // init later if the visitor opts in without a reload
    return;
  }

  loading = true;
  try {
    const mod = await import("posthog-js");
    posthog = mod.default;
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: "https://eu.i.posthog.com", // keep UK/EU data in the EEA
      autocapture: false, // every event is declared in events.js
      capture_pageview: false, // we send page_viewed ourselves with route params
      capture_pageleave: true,
      person_profiles: "identified_only",
      persistence: "localStorage+cookie",
      session_recording: { maskAllInputs: true, maskTextSelector: "[data-private]" },
      loaded: () => {
        ready = true;
      },
    });
  } catch {
    /* analytics must never break the app */
  } finally {
    loading = false;
  }
}

// Re-run initAnalytics when consent changes to granted (the banner opts in without a page reload).
function armConsentListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener(CHANGED_EVENT, () => {
    if (hasAnalyticsConsent()) initAnalytics();
    else resetAnalytics();
  });
}

export function identify(user) {
  if (!ready || !posthog || !user?.id) return;
  posthog.identify(user.id, {
    plan: user.plan, // 'free' | 'pro'
    signup_month: user.createdAt?.slice(0, 7),
    programmes_connected: user.programmeCount ?? 0,
    email_sync_enabled: !!user.emailSyncEnabled,
    home_city: user.homeCity ?? null,
  });
}

export function track(event, props = {}) {
  if (!ready || !posthog) return;
  posthog.capture(event, props);
}

export function resetAnalytics() {
  if (ready && posthog) posthog.reset();
  ready = false;
}
