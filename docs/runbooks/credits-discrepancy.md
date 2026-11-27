# Runbook: Bonza Credits discrepancy

Bonza Credits are a **double-entry ledger** (`services/creditsService.js`, `BonzaCredit` rows in integer pence).
The balance is **computed live** as the sum of non-expired rows (clamped ≥ 0 for display); there is no cached
balance column to drift. Writes run at SERIALIZABLE with a 40001 retry (§27a). The table is **append-only** to
the app role (§27h/§27k) — corrections are new rows, never edits.

## Gather
- `/admin/user/:id` → `credits` (every row: `amountPence`, `source`, `createdAt`, `expiresAt`).
- Audit: `GET /admin/audit?subjectUserId=<id>&action=credit.awarded` (+ `credit.redeemed`, `credit.reversed`).
  Each movement has before/after and a `request_id` (§27k).

## Reconcile
- **Display balance** = `max(0, Σ amountPence where expiresAt > now)`; **raw** may be negative after a refund.
- Walk the rows: cashback awards (`cashback_<leg>` / `first_booking_bonus`, +), redemptions (`redeemed`, −,
  never expire), refund reversals (`refund_reversal`, −). They should sum to what the user sees.
- **Negative raw balance** — an unsettled refund (`reverseCredits`) drove it below zero; redemption is **blocked**
  until it clears (guard in `redeemCredits`). That's by design, not a bug.

## Common causes
- **"I didn't get cashback on a flight"** — flights earn **no** credits (hotels/cars only; `cashbackRateFor`).
  Correct behaviour.
- **"I only got it once"** — non-Pro users earn cashback on the **first booking only**; after that it's Pro-only.
- **Nightly invariant alarm** (§27e-8) — the sanity job flags any user whose live sum < 0 outside a refund block.
  If it fires, find the stray negative row via the audit trail; the fix is a compensating **positive** row through
  the service if the reversal was wrong — never an `UPDATE`.

## Resolve
- A genuine missing/erroneous credit is corrected with a **new** `BonzaCredit` row via the service (a manual
  award/adjustment path), which audits as a credit movement. The DB rejects `UPDATE`/`DELETE` from `bonza_app`,
  so there is no "just fix the row" option — and that's the point.
