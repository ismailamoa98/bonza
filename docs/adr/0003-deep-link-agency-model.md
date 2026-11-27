# 0003 — Deep-link agency model for points bookings

**Status:** Accepted

## Context
When the best option is a **points** redemption (e.g. transfer Amex → a hotel programme and book on points), Bonza
cannot complete that booking: the award inventory, the transfer, and the reservation live at the loyalty
programme, not with Bonza. Pretending to book it in-app would be dishonest and operationally impossible.

## Decision
Points bookings are a **deep-link handoff**: Bonza hands the user off to the programme's own site with the trip
pre-filled (`services/awardLinks.js`, `POST /bookings/points-handoff`), records a `UserJourney`, and lets the user
**self-report** completion (`/journeys/confirm-booking`). Cash bookings are different — flights are booked in-app
via Duffel; hotel/car cash legs are affiliate deep-links. The support layer makes this explicit with the
`BookingBoundary` ("points bookings live at the programme — Bonza can't change them").

## Consequences
- **+** Honest: we never claim to hold award inventory or guarantee a transfer.
- **+** No liability for award bookings we can't control; the user transacts directly with the programme.
- **−** Attribution is imperfect — we rely on self-report + affiliate postbacks, not a confirmed order. Journey
  attribution (§8) and dup-account prevention mitigate this.
- **−** A worse "conversion" surface than one-click, by design. The product value is the *recommendation*, not
  owning the transaction.
- Shapes support: a points booking problem is escalated to the programme, not handled as a Bonza booking.
