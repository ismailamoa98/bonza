# Runbook: Chargeback / payment dispute

A customer disputes a Stripe charge. The charge is the customer→Bonza payment for a cash booking (flight via
Duffel in-app; hotel/car via affiliate deep-link). Duffel is paid separately from Bonza's balance.

## When a dispute opens (Stripe `charge.dispute.created`)
1. **Find the booking.** `/admin/user/:id` → `bookings` (match `supplierReference`, `confirmationMethod`,
   `cashAmount`, `confirmedAt`), and the audit trail `GET /admin/audit?subjectUserId=<id>&action=booking.created`.
2. **Assemble evidence** in the Stripe dashboard: the confirmed `Booking` row, the Duffel order reference (for a
   flight), the affiliate click/deep-link trail (for hotel/car), and timestamps. Bonza's records tie the charge
   to a real, delivered booking.
3. **Submit evidence before Stripe's deadline.**

## If the dispute is lost / you refund
- Stripe pulls the funds. If the underlying booking is also being cancelled/refunded:
  - Reverse any cashback: `creditsService.reverseCredits({ userId, bookingId, proportion })` — posts a
    **negative** `BonzaCredit` (append-only; redemption is blocked while the balance is negative until it clears).
  - Mark the booking cancelled via the normal path (`POST /bookings/:id/cancel`) so it audits as
    `booking.cancelled` (§27k) and reverses credits consistently.
- **For a flight already ticketed on Duffel:** a chargeback doesn't un-ticket the Duffel order. Pursue the Duffel
  refund/void separately; Bonza eats the gap only if the ticket can't be voided.

## Fraud signal
- Repeated disputes from one `deviceFingerprint` — the first-booking cashback has a `CREDIT_FLAGGED` hold on a
  shared fingerprint (`creditsService`). Check for abuse; tighten §27d limits / Turnstile if it's a pattern.

## Never
- Don't `UPDATE`/`DELETE` `BonzaCredit` or `Booking` money fields to "fix" the books. Every correction is a new
  row through the service, and the `AuditEvent` trail (§27k) is your evidence.
