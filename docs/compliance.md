# Bonza — Compliance decisions (Phase 25 §25h/§25i)

This records the two compliance questions that are **decisions needing a qualified adviser**, not code. The
build (§25a–§25g, §25i UI) is done and made to fit either answer; nothing here is legal advice, and Bonza must
not launch the affected flow ahead of the opinion.

---

## 1. ICO registration (data protection fee) 🔴 go-live blocker

Bonza is a UK data controller processing personal data by automated means, so it must register with the ICO
and pay the data protection fee.

**Actions (one pass, ~30 min on ico.org.uk):**
- [ ] Register the entity that actually operates the service (sole trader or the limited company).
- [ ] Pay the fee for the correct tier — tiering is by headcount/turnover; **check the current amount on
      ico.org.uk** (the schedule changes; don't trust a quoted figure).
- [ ] Put the **ICO registration number in the footer** (placeholder already in `components/Footer.jsx`).
- [ ] Appoint the named contact (yourself).
- [ ] Write the one-page **Record of Processing Activities (Article 30)** — the §25f retention table plus the
      §25a sub-processor table is ~90% of it already.
- [ ] Note the **breach-reporting route** (the 72-hour ICO path) so it's known before it's needed.
- [ ] **DPO**: almost certainly not required at this scale — record the reasoning (no large-scale systematic
      monitoring, no large-scale special-category processing) and move on.

---

## 2. ATOL / Package Travel Regulations 🔴 criminal-offence go-live blocker

Selling a flight together with accommodation as a single trip is, in the general case, a **flight-inclusive
package** under the Package Travel and Linked Travel Arrangements Regulations 2018. Selling flight-inclusive
packages to UK consumers **without ATOL protection is a criminal offence** (administered by the CAA).

Whether Bonza is caught turns on facts about the build, not marketing wording:

1. **Who the consumer contracts with.** If Bonza takes payment and issues the confirmation, it looks like the
   seller of the package. If the contract is with the airline/accommodation supplier and Bonza is a *disclosed
   agent*, the position changes — but "disclosed agent" is a legal test about the consumer's reasonable
   understanding, not a line in the Terms.
2. **Whether Duffel's own licensing covers the sale.** Duffel sells flights as an IATA-accredited agent and
   Stays separately. Whether that extends ATOL cover to a package assembled on top is a question **for
   Duffel's compliance team in writing** — ask directly and keep the answer.
3. **Package vs. Linked Travel Arrangement.** A flight booked, then accommodation booked separately through a
   distinct process, may be an LTA (lighter regime, own insolvency-protection/disclosure duties, flow-sensitive)
   rather than a package. The Phase 12 panel's single bundled total + one checkout points toward **package**.
4. **The points path is likely outside all of it.** A deep link to the programme's own site, where the user
   transacts with the airline, is not Bonza selling a package — this is the §25i agency position doing real
   work, and why the architecture is worth preserving even at a conversion cost.

**Action:** book an hour with a travel-regulation solicitor (ABTA and the Travel Trade Consultancy both refer).
Take them the Phase 12 checkout flow, the Phase 7 payment path, and Duffel's written answer. Ask specifically:
**are we a package organiser, an agent, or an LTA facilitator, and does Duffel's licensing cover us?**

Depending on the answer, one of three routes:
- **Agent of the supplier** — restructure so the consumer contracts with the supplier, with disclosure at each
  step. Cheapest; the architecture already leans this way.
- **Accredited body / franchise** — sell flight-inclusive packages under another ATOL holder's licence. Common
  for small operators; costs a slice of margin; fastest legitimate route to packages.
- **Own Small Business ATOL** — your own licence (viable under 500 passengers/year); needs accounts, a bond and
  a CAA application. Slowest.

### Build-side hedge (done)

- `env.bundledCheckoutEnabled` / `VITE_BUNDLED_CHECKOUT_ENABLED` gates the **single-total flight+hotel cash
  checkout**. It **defaults ON for the build but MUST be set to `false` at go-live** until this is answered.
  Enforced in **both** places: the frontend `BookingPage` (hides the pay button, tells the user to book the
  legs separately) and the backend `POST /bookings/confirm-cash` (403 when a single order contains both a
  flight and a hotel leg).
- **Flight and hotel cash paths are kept separable** in code, so an agent-model restructure is a flow change,
  not a rewrite.
- **Points-only and hotel-only / flight-only cash flows are not exposed** to this and can launch ahead of it.
- The **§25i agency disclosures** are live: the points deep-link interstitial (`PointsRedeemModal`), the named
  contracting supplier above the cash pay button (`BookingPage`), and the cached-price "availability and
  transfer ratios can change" disclaimer (search `DetailPanel`, explore `CityDrawer`).

---

## 3. VAT (confirm with an accountant)

Bonza Pro at £49.99/yr is a digital service and VAT-liable once over the registration threshold; travel
commission is treated differently. Confirm the position with an accountant alongside the ATOL opinion.
