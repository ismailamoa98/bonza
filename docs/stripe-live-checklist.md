# Stripe live-mode checklist (Phase 25 §25g)

Stripe will not switch the account to live until these are in place. Several overlap with ICO/legal (§25h)
and the legal pages (§25a–c), so work them in one pass. Status below reflects what the codebase does; the
account-level items are actions for whoever operates the Stripe account.

## Business + payout (Stripe dashboard — action)

- [ ] Registered company name, number, registered address, SIC code, and director details entered.
- [ ] Verified bank account for payouts.
- [ ] Travel-sector position agreed with Stripe **up front**. Travel is higher-risk; Stripe may hold a
      rolling reserve against future chargebacks. Ask before launch, not when the first payout is held.

## Public-facing URLs Stripe checks (shipped)

- [x] Terms URL — `/legal/terms`
- [x] Privacy URL — `/legal/privacy`
- [x] Refund & cancellation policy — `/legal/booking-terms#refunds` (substantive anchor, not a stub)
- [x] Contact method on the site — `/help/contact`

## Payments code (shipped — do not regress)

- [x] **SCA / 3DS2**: PaymentIntents created with `automatic_payment_methods: { enabled: true }`
      (`services/paymentService.js`). Stripe applies 3DS2 under its own rules. **No code requests an SCA
      exemption**, and travel's high fraud-flag rate means we must not add one.
- [x] **Statement descriptor**: `statement_descriptor_suffix: "TRAVEL"` on every booking PaymentIntent, so
      the charge reads as `BONZA* TRAVEL` and matches the brand the customer remembers. (Set the account's
      base descriptor to `BONZA` in the Stripe dashboard.)
- [x] **Webhook signature verification**: `/api/v1/webhooks/stripe` verifies `STRIPE_WEBHOOK_SECRET`
      (`api/subscriptions.js` → `stripeService.handleWebhook`).
- [x] **Webhook-failure alarm**: CloudWatch alarm from Phase 11 infra.

## Launch-but-not-Stripe-specific (action)

- [x] Trading name + company number in the footer (placeholders in `components/Footer.jsx` — fill at cutover).
- [ ] VAT position: Bonza Pro at £49.99/yr is a digital service and VAT-liable once over the registration
      threshold; travel commission is treated differently. Confirm with an accountant alongside the ATOL
      question (§25h in `pre-go-live.md`).

## Go-live flag interaction

- The bundled flight+hotel single-total cash checkout is gated on `env.bundledCheckoutEnabled`
  (`BUNDLED_CHECKOUT_ENABLED`), which **defaults ON for the build but must be set to `false` at go-live**
  until the ATOL question is answered (§25h). Flight-only and hotel-only cash paths are unaffected.
