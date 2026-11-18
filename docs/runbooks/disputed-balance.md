# Runbook: Disputed points balance

A user says their loyalty balance in Bonza is wrong. Bonza is **statement-authoritative** (ADR 0002): the
balance comes from the user's own programme statements (parsed from email) or a manual override — Bonza never
invents it, and the real balance lives at the programme, not here.

## Gather
- The user's id and, if they have it, the `request_id` or the time they synced.
- Open `/admin/user/:id` → `balances` (per-programme `balance`, `syncState`, `statementDate`, `lastSynced`) and
  `syncRuns`.
- Open the **audit trail**: `GET /admin/audit?subjectUserId=<id>&action=balance.manual_override` (and
  `balance.statement_applied`, `balance.quarantined`, `balance.quarantine_resolved`). Every balance change is
  there with before→after, source, and `request_id` (§27k).

## Diagnose
- **`syncState: updated` with a recent `statementDate`** — the statement said this. The parsed figure superseded
  the old one. Show the user the statement date; the balance reflects their latest statement.
- **A `balance.quarantined` audit row** — a suspicious read was **held, not applied** (§27c). The user's value
  was kept. They may be seeing the quarantined figure in the review modal; confirm which number is which.
- **`syncState: not_checked`** — we never got a statement (bank/card programmes are manual). The number is
  whatever the user last entered.
- **Manual override** — `balance.manual_override` shows the user set it by hand.

## Resolve
- **The statement genuinely misparsed** (e.g. a promo figure read as the balance): the guard should have
  quarantined it, but if it slipped through, the fix is a **manual override** to the correct value
  (`PATCH /points/balance/:accountId`) — this audits as `balance.manual_override` and holds until the next
  statement. Then capture the email as a golden fixture (`test/fixtures/statements/<programme>/`) so the parser
  learns it. **Never** `UPDATE` the row directly.
- **The parser is wrong for a whole programme** — check `/admin/parsers` success rate; if a format changed,
  that's a parser fix + new fixtures, not a per-user action.

## Never
- Hand-edit `LoyaltyAccount.balance` in the DB. Go through `setManualBalance` so the change is locked (§27a),
  audited (§27k), and honest about being a manual override.
