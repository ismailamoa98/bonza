# Runbook: Stripe outage (payments / subscriptions)

Stripe charges the customer→Bonza card payment for cash bookings (`services/paymentService.js`,
`/bookings/payment-intent` + `/bookings/confirm-cash`) and Bonza Pro subscriptions (`services/stripeService.js`
+ `/webhooks/stripe`). Duffel is paid separately from Bonza's balance — Stripe is only the customer charge.

## Symptoms
- Checkout failing at the payment step; `/subscriptions/create` failing; webhook deliveries backing up.
- Sentry `PAYMENT_FAILED` errors (the error contract maps Stripe errors to this code).

## Confirm
- [Stripe status](https://status.stripe.com). Check whether it's **PaymentIntents** (checkout) or **webhooks**
  (subscription state) that's affected.

## Mitigate
- **PaymentIntent creation / confirmation failing:** users can't complete cash checkout. There's no mock in prod
  (real money), so surface a clear "payments are temporarily unavailable" state and **don't** let a user proceed
  to a Duffel order that can't be paid for. Points bookings (deep-link handoff) are unaffected — steer users there.
- **Webhook backlog:** subscription state (`active`/`cancelled`) lags. The webhook is **idempotent** (§27a
  `ProcessedWebhook`, `@@unique([provider,eventId])`) — Stripe will redeliver and replays are safe (return 200,
  no double effect). Don't manually re-apply; let Stripe retry. Pro access uses `isProActive(sub)` which grants
  until `currentPeriodEnd`, so a short webhook delay doesn't revoke Pro.

## Resolve
- When Stripe recovers, replayed webhooks reconcile subscription state automatically (idempotent). Spot-check a
  few affected users via `/admin/user/:id`.

## Money-safety checks
- **Charged but no booking?** Refund in Stripe, then `creditsService.reverseCredits` for any cashback. Never edit
  `BonzaCredit` directly (append-only, §27k audits the reversal).
- **Double-charge?** Shouldn't happen — `/bookings/confirm-cash` verifies the PI and `Booking.idempotencyKey` is
  `@unique` (§27a double-submit guard). If it did, refund the duplicate and file a bug with the `request_id`.
