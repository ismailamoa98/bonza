// lib/analytics/events.js — Phase 24 §24b. The one event taxonomy. Nothing calls track() with a string
// literal — always track(EV.SEARCH_RUN, {...}) — so the taxonomy stays greppable and typo-proof.
//
// Property rules (enforced by convention + review):
//  - snake_case keys, primitive values only (string | number | boolean | null). No nested objects/arrays.
//  - Every search-side event carries: origin, destination, depart_month (NOT the exact date), pax, cabin,
//    trip_type.
//  - Every monetisation event carries: plan, surface ('search_results' | 'points_page' | 'hero' | 'settings').
//  - Every failure event carries: service ('duffel' | 'seats_aero' | 'rooms_aero' | 'stripe' | 'claude' |
//    'resend' | 'internal'), code, status, retryable.
//  - Money in minor units with a `currency` key; never a formatted string.
//  - NEVER pass email, name, point balances, card numbers, booking references, or passenger names.

export const EV = {
  // acquisition
  PAGE_VIEWED: "page_viewed",
  HERO_DESTINATION_CLICKED: "hero_destination_clicked",
  EXPLORE_COUNTRY_CLICKED: "explore_country_clicked",
  EXPLORE_MAP_CLICKED: "explore_map_clicked",
  CITY_DRAWER_OPENED: "city_drawer_opened",

  // onboarding
  SIGNUP_STARTED: "signup_started",
  SIGNUP_COMPLETED: "signup_completed",
  ONBOARDING_STEP_VIEWED: "onboarding_step_viewed",
  ONBOARDING_SKIPPED: "onboarding_skipped",
  ONBOARDING_COMPLETED: "onboarding_completed",
  PROGRAMME_CONNECTED: "programme_connected",
  EMAIL_SYNC_CONNECTED: "email_sync_connected",
  EMAIL_SYNC_FAILED: "email_sync_failed",

  // search
  SEARCH_RUN: "search_run",
  SEARCH_NO_RESULTS: "search_no_results",
  SEARCH_FILTER_APPLIED: "search_filter_applied",
  PACKAGE_PANEL_OPENED: "package_panel_opened",
  PACKAGE_LEG_EXPANDED: "package_leg_expanded",
  CALENDAR_OPENED: "calendar_opened",
  CALENDAR_DATE_PICKED: "calendar_date_picked",

  // monetisation
  PRO_UPSELL_VIEWED: "pro_upsell_viewed",
  PRO_CHECKOUT_STARTED: "pro_checkout_started",
  PRO_SUBSCRIBED: "pro_subscribed",
  PRO_CANCELLED: "pro_cancelled",

  // booking
  BOOKING_STARTED: "booking_started",
  BOOKING_PAYMENT_SUBMITTED: "booking_payment_submitted",
  BOOKING_CONFIRMED: "booking_confirmed",
  BOOKING_FAILED: "booking_failed",
  DEEPLINK_OPENED: "deeplink_opened",
  CREDITS_EARNED: "credits_earned",
  CREDITS_REDEEMED: "credits_redeemed",

  // points
  BALANCE_ENTERED_MANUALLY: "balance_entered_manually",
  BALANCE_SYNCED: "balance_synced",
  BALANCE_DISCREPANCY_SHOWN: "balance_discrepancy_shown",
  BALANCE_DISCREPANCY_RESOLVED: "balance_discrepancy_resolved",
  TRANSFER_PARTNER_VIEWED: "transfer_partner_viewed",
  PROGRAMME_CARD_EXPANDED: "programme_card_expanded",

  // support
  HELP_TOPIC_OPENED: "help_topic_opened",
  HELP_ARTICLE_OPENED: "help_article_opened",
  SUPPORT_ASSISTANT_ASKED: "support_assistant_asked",
  SUPPORT_ASSISTANT_ESCALATED: "support_assistant_escalated",
  SUPPORT_TICKET_CREATED: "support_ticket_created",
  PROGRAMME_CONTACT_VIEWED: "programme_contact_viewed",

  // failure (always fired alongside the Sentry report, never instead of it)
  API_ERROR: "api_error",
  SERVICE_DEGRADED: "service_degraded",
  ERROR_BOUNDARY_HIT: "error_boundary_hit",
  OFFLINE_DETECTED: "offline_detected",
  RETRY_EXHAUSTED: "retry_exhausted",
};

// Known `service` values for failure events (keep in sync with backend serviceHealth mapping).
export const SERVICE = {
  DUFFEL: "duffel",
  SEATS_AERO: "seats_aero",
  ROOMS_AERO: "rooms_aero",
  STRIPE: "stripe",
  CLAUDE: "claude",
  RESEND: "resend",
  INTERNAL: "internal",
};

// Surfaces for monetisation events.
export const SURFACE = {
  SEARCH_RESULTS: "search_results",
  POINTS_PAGE: "points_page",
  HERO: "hero",
  SETTINGS: "settings",
};
