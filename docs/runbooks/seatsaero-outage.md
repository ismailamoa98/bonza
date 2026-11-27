# Runbook: Seats.aero outage (award availability)

Seats.aero powers award-flight availability (`services/seatsAeroService.js`). It's Pro-gated and read-only — no
money moves through it, so an outage is **degrade-only**.

## Symptoms
- `BonzaServiceDegraded Service=seats_aero`; award results missing or labelled `SAMPLE`.
- Possibly `BonzaSpendExhausted Service=seats_aero` (§27d) — not an outage, a budget cap (scraper or runaway).

## Confirm
- Dependency dashboard + [Seats.aero status]. Distinguish **outage** (`ServiceDegraded`) from **budget**
  (`SpendExhausted`): the budget case is the spend ledger denying interactive calls above the reserved nightly
  slice — the fix is rate limiting, not Seats.aero.

## Mitigate
- **Outage:** `searchAwardFlights` falls back to `mockAwardFlights`; the UI shows `SAMPLE`. We **never invent
  award availability** (hard rule) — the sample is clearly labelled and the deep-link tells the user to confirm
  at the programme. Nothing to do but confirm the degraded state is honest.
- **Budget exhausted:** check `SpendLedger` for the day (`service='seats_aero'`). If it's a scraper, tighten the
  per-IP/public limiters (§27d) or block at Cloudflare. The nightly `explore_refresh` reservation is protected,
  so background refresh still runs.

## Resolve
- Degraded clears on a clean window. A budget cap resets at UTC midnight; raise `SPEND_BUDGET_SEATS_AERO` only
  if the usage is legitimate.

## Comms
- None needed — this is a graceful degrade. If award search is down for an extended period, a `/status` note is
  enough; no proactive email.
