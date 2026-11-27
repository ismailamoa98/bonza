# Runbook: Duffel outage (flight search / booking)

Duffel is the cash-flight inventory + the in-app flight booking rail (`services/duffelService.js`,
`utils/bookingWriter.js` `confirmationMethod: "duffel"`). Hotels/cars are affiliate deep-links, unaffected.

## Symptoms
- `BonzaServiceDegraded Service=duffel` on the dependency dashboard; `/status` shows flights degraded.
- Users report flight search returning nothing / "sample" results, or cash-flight checkout failing.
- Sentry errors from `duffelService` with a resolving `request_id`.

## Confirm
- `serviceHealth` flips a dependency to `degraded` after repeated failures within the window — check the
  `ServiceDegraded` metric. Check [Duffel status](https://status.duffel.com).
- Reproduce: a cash flight search for a known route. Note whether it's **search** (degraded, mock served) or
  **booking** (`/bookings/confirm-cash` → Duffel order) failing — booking is the one that costs a user.

## Mitigate
- **Search failing:** nothing to do — `duffelService.searchFlights` falls back to `mockSearchFlights` and the UI
  labels results `SAMPLE`. Confirm users still see results; the degraded state is honest.
- **Booking failing:** this is the painful one. `confirm-cash` re-searches + re-prices + orders; if Duffel can't
  order, the Stripe PaymentIntent must **not** be captured for a flight that didn't book.
  - Verify no orphaned charge: a failed `bookCashFlight` should not have written a `Booking` row (writeBooking
    runs after the Duffel order). If a user was charged but has no flight, refund via Stripe and post the credits
    reversal through `creditsService.reverseCredits` (never hand-edit).
  - Consider toggling flight checkout to "unavailable" in the UI if Duffel booking is hard-down (feature flag /
    status banner) so users aren't charged into a failing order.

## Resolve
- When Duffel recovers, `serviceHealth.recordSuccess` clears the degraded state automatically after a clean
  window; `/status` returns to operational and the `SAMPLE` labels drop.

## Comms & post-incident
- If only search degraded: no comms needed (mock covered it).
- If booking failed and users were affected: proactive email to affected users, confirm refunds landed.
- Post-incident: confirm the env-gating held (no 500s), and that spend budgets (§27d) weren't the real cause.
