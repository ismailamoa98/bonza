# 0001 — Duffel for flight/hotel inventory

**Status:** Accepted

## Context
Bonza needs cash flight + hotel inventory and the ability to actually book a flight in-app. The options were a
GDS direct integration (Amadeus / Sabre / Travelport) or an aggregator/API-first provider (Duffel).

GDS direct gives the broadest content but comes with heavy onboarding (IATA/ARC accreditation, ticketing stock,
debit memos, EDIFACT/legacy or nascent NDC), long contracts, and operational burden that doesn't fit a small
team shipping an optimisation product rather than a traditional OTA.

## Decision
Use **Duffel** as the cash flight + Stays provider (`services/duffelService.js`), and book flights in-app through
Duffel orders paid from Bonza's Duffel balance (the customer is charged separately via Stripe). Hotels/cars that
aren't booked in-app are **affiliate deep-links**. Everything is env-gated with deterministic mocks so dev runs
offline.

## Consequences
- **+** Fast integration, modern JSON API, NDC content without GDS accreditation, a sane sandbox for offline-first
  development.
- **+** One provider seam (`duffelService`) with a mock fallback — swapping or adding a provider later is contained.
- **−** Narrower content than a full GDS; some fares/airlines are unavailable. Acceptable — Bonza competes on the
  cash-vs-points *optimisation*, not on being the widest flight shop.
- **−** Duffel balance funding is an operational concern (pre-funded); reconciliation matters (see the chargeback
  runbook — a Stripe chargeback doesn't un-ticket a Duffel order).
- Revisit if content gaps become a real conversion problem or volume justifies a GDS/NDC aggregator.
