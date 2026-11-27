# Bonza analytics — funnels & alerts (Phase 24 §24c)

All events are emitted by the app (`src/frontend/src/lib/analytics`), declared in
`lib/analytics/events.js` (`EV`). PostHog is **EU cloud** (`https://eu.i.posthog.com`), consent-gated,
`autocapture:false`. Build these as **saved insights** in PostHog so there's one place to look when a
number moves; each has a named owner metric to check weekly. Staging uses a **separate** PostHog project.

## The six funnels

1. **Activation** — `signup_completed` → `onboarding_completed` → `programme_connected` → `search_run`.
   **Metric:** % reaching `search_run` within 7 days.
2. **Email sync adoption** — `onboarding_step_viewed` (step=`email_sync`) → `email_sync_connected` →
   `balance_synced`. **Metric:** connect rate, and `email_sync_failed` rate broken down by provider.
3. **Search → booking** — `search_run` → `package_panel_opened` → `booking_started` → `booking_confirmed`.
   **Breakdown:** `has_points_option` (boolean) — does hybrid pricing convert better than all-cash?
4. **Pro conversion** — `pro_upsell_viewed` → `pro_checkout_started` → `pro_subscribed`, broken down by
   `surface` (`search_results` | `points_page` | `hero` | `settings`). **Metric:** which surface earns the £49.99.
5. **Points path** — `programme_connected` → `programme_card_expanded` → `transfer_partner_viewed` →
   `deeplink_opened`. **Metric:** deep-link rate per connected programme (affiliate-revenue proxy).
6. **Support deflection** — `help_topic_opened` → `support_assistant_asked` → either
   `support_ticket_created` or session end. **Metric:** deflection rate = 1 − (tickets / assistant conversations).

## Trends & alerts

- **Trend** on `api_error` grouped by `service` (`duffel|seats_aero|rooms_aero|stripe|claude|resend|internal`).
- **Alert (pages you):** `booking_failed / booking_started` > **5% over a rolling hour** — mirrors the §11
  CloudWatch alarm. The same signal also lives server-side: `serviceHealth` flips `ServiceStatus` and emits
  the `BonzaServiceDegraded` metric line (CloudWatch Logs metric-filter), so PostHog and CloudWatch agree.

## Property conventions (enforced in `events.js`)

- Primitive values only; `snake_case` keys.
- Search events: `origin`, `destination`, `depart_month` (not the exact date), `pax`, `cabin`, `trip_type`.
- Monetisation events: `plan`, `surface`.
- Failure events: `service`, `code`, `status`, `retryable`.
- Money in **minor units** + a `currency` key; never a formatted string.
- **Never** email, name, balances, card numbers, booking references, or passenger names.
