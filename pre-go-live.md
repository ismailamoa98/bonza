# Bonza — Pre-Go-Live Checklist

> Living record of caveats, data-integrity gaps, licensing/commercial issues and follow-up passes that
> **must be resolved before Bonza serves real users**. Bonza is offline-by-default: nearly everything
> external is mock behind an `env` flag, and much reference/seed data is placeholder. This file is the
> single place to track what has to become real, correct, and legally clear at cutover.
>
> Last updated: 2026-09-28. Owner: _unassigned_. Legend — 🔴 blocker · 🟠 important · 🟡 nice-to-have.

---

## 1. Image sourcing & licensing (COMMERCIAL — highest priority) 🔴

The Explore feature displays photos pulled at runtime/backfill from third-party image APIs. **All of this
imagery is externally owned and mostly Creative-Commons licensed — it is not cleared for commercial use as-is.**

**Where images come from** (`src/backend/services/explorePhotos.js`):
- **Wikipedia / Wikimedia Commons lead images** — primary source for city landmark galleries and list/grid
  thumbnails. Licenses vary per file (CC-BY, CC-BY-SA, public domain, occasionally more restrictive).
- **Openverse** (CC image search, mostly Flickr) — fallback for landmarks and the **hotel room galleries**
  (`hotelPhotos()`); returns CC-BY / CC-BY-SA / CC0 and sometimes non-commercial (CC-NC) results.
- **Unsplash** — only if `UNSPLASH_ACCESS_KEY` is set (Unsplash License; still has attribution/API-terms
  obligations).

**Issues to resolve:**
- 🔴 **License audit + attribution.** CC-BY / CC-BY-SA **require visible attribution** (author, license,
  link) and share-alike terms; **CC-NC forbids commercial use entirely.** We currently render none of this.
  Either (a) capture + display attribution per image and filter out NC/ND, or (b) replace with a
  commercially-licensed source (paid stock, or a hotel/destination **content API** with cleared rights).
- 🔴 **Hotlinking third-party CDNs in production.** Backfilled `ExploreCountry.imageUrl` / `ExploreCity.imageUrl`
  (in the DB) and all live galleries point straight at `upload.wikimedia.org` / `live.staticflickr.com` /
  `api.openverse.org`. That is fragile (availability, rate limits), against some hosts' hotlinking norms, and
  strips attribution. **Action:** ingest chosen images to our own storage/CDN, record license + credit
  metadata, and serve from there.
- 🟠 **Hotel photos may misrepresent the property.** `hotelPhotos()` searches by the exact property name;
  when the (currently mock) property isn't a real hotel it **falls back to generic chain room shots**. Under
  real inventory, source photos from the hotel-content provider so pictures match the actual property.
- 🟡 **Quality/consistency.** Provision `UNSPLASH_ACCESS_KEY` (or a paid source) for consistically high-quality,
  city/landmark-specific imagery; the service already prefers Unsplash when the key is present. Re-run the
  backfill afterwards.

**Relevant files:** `services/explorePhotos.js`, `db/backfillExplorePhotos.js`, `db/cityLandmarks.js`,
`api/explore.js`, `components/explore/CityDrawer.jsx`, `pages/CountryPage.jsx`,
`components/explore/country/*` (Phase 19 hero + city cards consume the same imagery).

### 1a. Procuring / producing licensed assets — the §19b target state 🔴

The end state (Phase 19 §19b) is **one curated, self-hosted image per country hero and per city**, replacing
every keyword-sourced URL. Concretely:

- **Choose a licensed source.** Options, in rough order of effort/cost:
  1. **Unsplash** (free, Unsplash License allows commercial use) — set `UNSPLASH_ACCESS_KEY`; still credit
     photographers per their API terms. Cheapest path; quality is high but not guaranteed per-landmark.
  2. **Paid stock** — Adobe Stock / Getty / Shutterstock / iStock. Buy an extended/commercial licence per
     asset; best consistency and legal clarity. Budget for ~160 assets (≈60 heroes + ≈98 cities).
  3. **Destination / hotel content API** — e.g. an OTA/hotel-content provider (matches real properties for
     the hotel galleries and often bundles destination imagery with usage rights).
- **Curate, don't query.** Pick one image per country and per city by hand (§19b) — no keyword search in the
  live path (a `japan,mountain` query eventually serves fighter jets over Fuji).
- **Record provenance.** For every asset store source, licence type, licence ID/receipt, author + required
  credit, and the URL it replaced — keep this alongside the assets (a manifest or a DB table) for audit.
- **Produce the crops** per §19b and upload to the Phase-11 S3 frontend bucket under `explore/`:
  `heroes/<code>.webp` (1400×500, WebP q82, ≤200 KB) and `cities/<iata>.webp` (560×374, WebP q82, ≤120 KB).
- **Point the app at them.** Set `ExploreCountry.heroImageUrl` (+ keep `imageUrl` as a fallback) and
  `ExploreCity.imageUrl` to the self-hosted `/explore/...` paths; then **remove the keyword-sourced hotlinks**
  (Wikimedia / Flickr / Openverse) currently stored by `db/backfillExplorePhotos.js`. This supersedes the
  current keyword imagery and clears the CC-attribution debt in §1 above.
- **Fallback stays.** A missing `heroImageUrl`/`imageUrl` must always fall back to `ExploreCountry.gradient`
  so a not-yet-sourced asset never yields a blank hero/card (already implemented in Phase 19).

---

## 2. Explore "Everywhere" sample data (flights · hotels · award seats) 🔴

Everything in the `/explore` city drawer's trip figures is **seeded mock**, labelled `SAMPLE` in the UI.

- **What's mock** (`db/seedExplore.js`): `ExploreRoute` (flight cash + points, per origin), `ExploreHotel`
  (named properties + points), `ExploreAvailability` (six-month award-seat strip). All derived from a hash of
  the city code — **not accurate for any city/country.**
- **Honesty guard in place:** `GET /explore/city/:id` returns `sample: !(hasDuffel && hasSeatsAero)`; the
  drawer shows a `SAMPLE` tag on Typical trip / Hotels on points / Award seats and replaces the fabricated
  seat count with "Typically best around <month> — search for live seats". **This flag drops to false
  automatically** once the real keys are set.
- 🔴 **Award-availability honesty rule.** Bonza's hard rule is *never invent award availability.* The seeded
  strip invents a "best month" and seat counts — it must be backed by **real Seats.aero data** before it is
  ever shown *without* the `SAMPLE` label.
- 🟠 **Templated hotel names.** `HOTEL_CHAINS` produces `Park Hyatt {city}` / `{city} Marriott` / `Hilton {city}`
  with mock ascending points — these specific properties/rates are **not verified to exist or be bookable on
  points.** Replace with real rooms.aero award data.
- 🟠 **Award-hotel coverage is mock.** Every seeded city carries exactly 3 award hotels **except** a hand-picked
  `NO_AWARD_HOTELS` set (`db/seedExplore.js` — HKT/JTR/AGP/FAO/HRG/ZNZ/NAN/BGI/MLE/SEZ/GOI) given **0** award
  hotels so the country page's "Hotels on points" filter visibly narrows. This split is arbitrary/demo, not
  real coverage — rooms.aero determines which properties are actually bookable on points at go-live, at which
  point `hotelsOnPoints` / `ExploreHotel` rows (and this filter's behaviour) become real.
- 🟠 **Prices are month-granular, not per-day.** `ExploreRoute` cash doesn't vary by date and `ExploreAvailability`
  is one row per month, so there is no true per-day fare/award data. Two consequences to fix once real data
  lands: (1) the country page's hotel figures scale linearly with `nights` (§2 above / §19c caveat) rather than
  following real award charts; (2) the `CityDrawer` "Search flights & hotels" **flexible** date resolution
  (`resolveTripDates()` in `components/explore/CityDrawer.jsx`) picks the *least-redeemable-points month* and a
  mid-month window — it cannot yet pick the genuinely cheapest/least-points **days**. Real day-level fare +
  award data (Duffel calendar / Seats.aero per-day) is needed to make "cheapest days" accurate; until then a
  flexible search lands on a representative window in the best month, not the optimal dates.

- 🟠 **Date-picker price calendar is mock.** The search bar's custom range picker (`components/RangeDatePicker.jsx`)
  shows a per-day cash fare on every cell (cheapest in green) and a green award-seat dot, fed by the public
  `GET /api/v1/price-calendar` (`api/priceCalendar.js`). Those per-day numbers are **deterministic mock**
  (hash of origin+destination, cheaper midweek, ~1/3 of days flagged award) — not real fares or award seats.
  Real path = Duffel price-calendar + Seats.aero per-day (env-gated), same response shape. The `oneway` and
  `flex` (±3/±7) params now reach `/search` but the mock results don't yet honour them (flex feeds the
  Seats.aero fallback window at go-live).
- 🟠 **Homepage search options are partly inert.** The hero panel's **"Show award availability"** checkbox sets
  `award=1` on the `/search` URL, but the **mock search results don't yet honour it** (a points-first / award
  surfacing view needs real award data). **"Add nearby airports"** swaps the origin to its metro code (e.g.
  `from=LON`) which **Duffel honours live**, but the offline mock flight search treats a metro code like any
  other. Both flags flow through `utils/searchUrl.js` `buildSearchUrl` today; the results-page behaviour is the
  go-live wiring.

**Action:** provision `DUFFEL_API_KEY` + `SEATS_AERO_API_KEY` (+ rooms.aero), run the (already-built, env-gated,
fail-soft) `jobs/exploreRefreshJob.js` — nightly/weekly, split by continent to respect the Seats.aero cap —
and verify the `SAMPLE` labels disappear and figures look sane.

**Relevant files:** `db/seedExplore.js`, `jobs/exploreRefreshJob.js`, `api/explore.js`, `lambda/handler.js`
(`explore_refresh`), `components/TripForm.jsx` (hero panel), `utils/searchUrl.js`.

---

## 3. Reference data authored by hand — verify before launch 🟠

- **City landmarks** (`db/cityLandmarks.js`) — 4 landmarks × 98 cities, curated by hand for the photo
  galleries. Spot-check for accuracy/spelling and that each resolves to the right Wikipedia article (a wrong
  title silently falls back to a generic city shot; logo/map/flag lead images are filtered but not every case
  is caught).
- **City airports** (`db/cityAirports.js`) — multi-airport metros keyed by primary IATA; hand-maintained.
  Verify codes/names and completeness; keep updated (airports open/close/rename).
- 🟡 **Airports are informational only.** The drawer lists a city's airports but they are **not wired into
  search** — tapping a secondary airport (e.g. Venice TSF) does not search from it. Decide whether to make
  them actionable (search-from, or "all <city> airports").
- 🟡 **Country row thumbnails** on the `/explore` list still use a **generic national photo**, not a signature
  landmark (cities do). Optionally add a ~60-entry country-landmark map and re-backfill.

---

## 4. "Investigate all mock seeds" — general 🟠

Per the standing instruction, **every seed/mock needs an investigate-and-replace pass** before go-live, not
just Explore. Seed scripts to review: `db/seed.js`, `db/seedExplore.js`, `db/seedDiscovery.js`,
`db/seedHeroDestinations.js`, `db/seedProgrammes.js`, plus the reference constants `db/countryCities.js`,
`db/worldDirectory.js`, `db/cityLandmarks.js`, `db/cityAirports.js`. Confirm which are legitimate reference
data (keep) vs. placeholder demo values (replace with real/live data).

Known seeded-for-look items that are **not yet wired to a real engine** (documented in `CLAUDE.md`):
- 🔴 **P15 statement-authoritative balance sync** — `syncState`/`BalanceSyncRun`/`/points/review` are seeded
  for the look; the real sync engine is **not wired**.
- 🟠 **Points activity feed** (`PointsActivity`, `/points/activity`) — seeded demo rows; no derivation engine
  or booking hooks.
- 🟠 **Dev auth fallback** — no Clerk session falls back to seeded `user_dev_demo` in development; confirm
  production returns 401 and no demo user leaks.
- 🟠 **`npm run db:seed` resets the dev user's loyalty accounts** to a demo set — ensure seeding never runs
  against production data.

---

## 5. Env-gated integrations to provision & verify 🔴

All are mocked offline; each needs real credentials and an end-to-end test in staging before launch
(flags in `src/backend/config/env.js`):

| Integration | Flag / key | Used for |
|---|---|---|
| Anthropic (live Claude) | `hasRealAnthropicKey` (`claude-opus-4-8`) | chat / optimizer copy |
| Duffel | `hasDuffel` | real flight search + **cash booking** |
| Seats.aero | `hasSeatsAero` | award flight availability (Explore + search) |
| rooms.aero | (hotel awards) | award hotels (Explore + search) |
| Stripe | `hasStripe` | customer payments (`bookings/confirm-cash`) |
| Affiliate network | `hasAffiliate` | hotel/car deep-link handoff + postbacks |
| Cartrawler | `hasCartrawler` | car inventory |
| Gmail / Outlook OAuth | `hasGmailOAuth` / `hasOutlookOAuth` | loyalty email sync |
| Resend | `hasEmailSend` (`re_…`) | transactional/marketing email |
| Google Places | `GOOGLE_PLACES_API_KEY` | genuine hotel reviews/aspect scores |
| Unsplash | `UNSPLASH_ACCESS_KEY` | high-quality Explore photos (see §1) |

- 🔴 **Clerk** (auth) requires real (production) keys to boot — no offline fallback.
- 🔴 **Prod DB migrations:** local dev uses `prisma db push` and the migrations dir is empty. Before cutover,
  **commit a baseline migration** so `prisma migrate deploy` (gated to prod/staging, fatal on failure) is a
  real no-op → real migration path.

---

## 6. Honesty & compliance rules to re-verify 🟠

- **Never invent award availability / guarantee upgrades / oversell** — audit all surfaces (Explore drawer,
  search, chat) once real data is in; remove any remaining fabricated figures shown without a `SAMPLE`/estimate label.
- **Loyalty verification honesty** — never show mock/parsed balances as "Verified"; verify per programme
  (hotels/airlines = email, banks/cards = manual). Re-check after real email sync is enabled.
- **Reviews** — genuine hotel reviews/aspect scores require `GOOGLE_PLACES_API_KEY`; offline shows a labelled
  sample. Ensure the "sample" labelling holds until the key is live.
- **GDPR / email** — unsubscribe (`GET /notifications/unsubscribe`) and opt-in gating must be exercised
  against the real Resend integration.
- **Cashback / first-booking fraud guard** — `deviceFingerprint`-based hold is inert until device capture
  exists; wire before enabling paid cashback.
- **Legal pages are draft templates.** `/privacy`, `/terms`, `/cookies` now exist (`pages/PrivacyPolicy.jsx`,
  `TermsOfService.jsx`, `CookiePolicy.jsx` via `components/LegalPage.jsx`) with Bonza-specific **draft** content
  carrying a visible "not legal advice" banner. Before launch they **must be reviewed by counsel** and completed
  with the real registered entity, jurisdiction and contact emails (placeholders used: "Bonza", England & Wales,
  `privacy@bonza.travel` / `legal@bonza.travel`). The whole **Company** footer column (About / Careers / Partners /
  Help) remains `#` placeholders; the locale/currency chip ("United Kingdom · English (UK) · £ GBP") is
  presentational — no switcher yet.
- **Cookie consent — mechanism in place, enforcement pending.** A consent banner + preferences modal now exists
  (`components/CookieConsent.jsx`, `utils/consent.js`; footer "Privacy settings" reopens it), storing a per-
  category choice (strictly-necessary always on; functional; analytics) in `localStorage`. **Still to do before
  launch:** actually **gate non-essential cookies/scripts on the stored choice** (nothing sets functional/
  analytics cookies today, so there's a mechanism but nothing yet consuming it — wire real analytics/functional
  loaders to check `getConsent()` before running), and confirm the banner meets UK PECR (equal-prominence
  accept/reject is implemented; have counsel confirm wording + that no non-essential cookie fires pre-consent).
- 🔴 **ATOL claim is live but unsubstantiated.** The search UI already asserts financial protection — an **"ATOL"**
  badge on every result (`components/search/SearchResultCard.jsx`, ~line 107) and **"ATOL protected · Your money
  is safe if we fail"** in the detail panel's "Why book with Bonza" grid (`components/search/DetailPanel.jsx`,
  ~line 278). Bonza holds **no ATOL** and these claims are **hardcoded/unconditional**. Making an ATOL-protection
  claim without holding the licence is a **CAA offence**. **Before launch:** (a) obtain a **legal/regulatory
  opinion** on whether Bonza's model (facilitator vs. principal/agent selling flight-inclusive packages) needs or
  qualifies for an ATOL; (b) if required, **hold the licence and display the real ATOL number**; (c) **until both
  are done, remove or gate the "ATOL" badge and the "ATOL protected" line** so nothing claims protection Bonza
  doesn't have. (Also review the other "Why book" claims — "Your money is safe if we fail", "24/7 support" — for
  substantiation.)
- 🔴 **ICO registration (data protection fee).** Bonza is a data controller (it processes personal + loyalty +
  payment data), so before launch it must **register with the UK Information Commissioner's Office and pay the
  annual data-protection fee**, then surface the **ICO registration number** (e.g. in the privacy policy / footer).
  This is an off-codebase business action, not a code change; the privacy policy currently only mentions the right
  to complain to the ICO. Appoint/record a data-protection contact (and assess whether a DPO is required).

---

## 6a. Phase 22 — Support (go-live items) 🟠

- 🔴 **Programme contact details are placeholders.** `ProgrammeContact` (seed `db/seedProgrammeContacts.js`) has
  curated manage/contact URLs for ~8 majors but **placeholder phone numbers** and Google-search fallbacks for the
  rest. The third-party boundary (`components/support/BookingBoundary.jsx`) is only as good as these — populate
  real phone numbers, contact URLs and "manage booking" deep links for **every** programme before launch.
- 🔴 **Clerk admin role.** `/admin/*` is gated by `middleware/requireAdmin.js` on a Clerk `role: "admin"` claim.
  Configure that role in the Clerk dashboard and assign it to staff; **the `ADMIN_DEV=true` dev fallback must be
  off in production** (it already refuses in `NODE_ENV=production`, but double-check the env).
- 🟠 **Support phone number is a placeholder.** `ContactPage.jsx` `SUPPORT_PHONE` (travelling-now fast lane) is a
  placeholder — set the real staffed line + hours.
- 🟠 **Complaints ADR body pending legal.** `/help/complaints` Stage 3 says "[ADR scheme to be confirmed]" —
  confirm the applicable ADR scheme and whether ABTA/CAA routes apply (ties to the ATOL item), plus the
  final-response wording, before publishing.
- 🟠 **Help articles: 23 of 28 are stubs.** The five ticket-preventers are written full
  (`db/seedHelp.js`); the rest are one-paragraph stubs — write real content before launch.
- 🟠 **Support assistant is a canned mock offline.** `services/supportAssistant.js` uses Claude only when
  `ANTHROPIC_API_KEY` is set; without it, it returns deterministic canned answers (escalation still works by
  keyword). Provision the key for real assistant replies; review the live prompt/behaviour against the hard
  rules before launch.
- 🟠 **Status is set manually.** `/status` + the incident banner read `ServiceStatus`; flipping a service to
  degraded/outage is manual via the DB/admin for now. Wire the Phase 11 §11e CloudWatch alarms to flip `state`
  automatically (ALB 5xx → `booking`, Lambda errors → `balance_sync`).
- 🟡 **Agent reply tooling is out of scope here.** The admin view is read-only (no editing/refunds/credit
  adjustments) and there's no agent console to reply to tickets from the UI yet — scope that separately with an
  audit trail + approval step.

---

## 7. This session's additions (for traceability)

Explore **§18e/§18i** work landed this cycle (all uncommitted on `tmp-phase12-test`):
- MapLibre `/explore` map + `CityDrawer` (gallery, trip total, hotels-on-points, award-seat strip).
- **Real landmark photos** for city galleries + list/grid thumbnails (Wikipedia primary, Openverse/Unsplash
  fallback, logo/map filtering) — see §1 for the licensing debt this creates.
- **City airports** in the drawer (`db/cityAirports.js`) — informational only (§3).
- **Hotel room galleries** — click-through lightbox per hotel; photos via `hotelPhotos()` (§1, §2 caveats).
- **`SAMPLE` labelling** across the drawer while offline (§2).

> When each item above is resolved, tick it here and note the PR / date.

---

## 8. Phase 23 — testing (go-live actions)

The suite is wired and green (unit + integration + frontend component; Playwright E2E scaffolded). Before
go-live:
- 🔴 **Enable branch protection** on `main` requiring the **`test`** and **`e2e`** checks to pass before
  merge (GitHub repo setting — not expressible in code). Without it the suite runs but nothing enforces it.
- 🟠 **Configure E2E secrets** so the `e2e` CI job actually runs (it self-skips and passes until then):
  `STAGING_CLERK_PUBLISHABLE_KEY`/`STAGING_CLERK_SECRET_KEY` (and the production equivalents),
  `E2E_CLERK_EMAIL`/`E2E_CLERK_PASSWORD` (a Clerk test user), and `STRIPE_TEST_SECRET_KEY` (+ the Stripe CLI
  for webhook replay in spec 05). The app needs Clerk test keys even to boot.
- 🟡 **Harness constraint (documented, not a bug):** Vitest in this repo does not intercept a SUT's own
  `require()` of its dependencies, so unit/integration tests use the services' offline env-gated behaviour and
  direct service calls rather than injected module mocks; HTTP tests act as the dev-fallback user
  (`user_dev_demo`). The live Anthropic/Stripe-client branches are therefore exercised in E2E, not unit — see
  `test/setup/unit.js` and `vitest.config.mjs` comments.
- 🟡 **`activityDerivation` tests are intentionally absent** — there is no points-activity derivation engine
  (the feed is seeded/presentation-only); add the engine first, then its tests.
- 🟡 **Coverage gate is money-path-first, not a blanket %.** Per-file line thresholds guard
  creditsService/redemptionEngine/bookingWriter/balanceSync/awardLinks/valuationRefreshJob/stripeService; the
  global floor is deliberately low (routes/jobs are integration/E2E territory). Raise per-file bars as more
  tests land.

---

## 9. Phase 25 — Legal & Compliance (go-live blockers) 🔴

The buildable work (§25a–§25g, §25i UI) is **done** and verified offline. The two decisions below need a
qualified adviser and are documented in full in **`docs/compliance.md`**; the Stripe account steps are in
**`docs/stripe-live-checklist.md`**. Do not launch the affected flows ahead of these.

- 🔴 **ICO registration** — register the operating entity + pay the data-protection fee; put the registration
  number in the footer (placeholder in `components/Footer.jsx`); write the Article 30 RoPA (the §25f retention
  table + §25a sub-processor table is most of it); record the breach-reporting route and the DPO reasoning.
  See `docs/compliance.md` §1.
- 🔴 **ATOL / Package Travel Regulations** — the criminal-offence blocker. Book a travel-regulation solicitor,
  take them the Phase 12 checkout + Phase 7 payment path + **Duffel's written licensing answer**, and settle
  whether Bonza is a package organiser, an agent, or an LTA facilitator. **Set
  `BUNDLED_CHECKOUT_ENABLED=false` at go-live** until answered — the flight+hotel single-total cash checkout is
  gated on it (frontend `BookingPage` + backend `POST /bookings/confirm-cash`), while flight-only / hotel-only
  cash and all points flows are unaffected. See `docs/compliance.md` §2.
- 🔴 **Legal document review** — all seven `/legal/*` documents are **draft templates pending counsel review**
  (banner retained on each). Fill the registered entity, jurisdiction, ICO number and contact details, and
  have counsel confirm the points-agency, liability-cap and consumer-rights clauses before launch.
- 🟠 **Footer company details** — trading name, company number and ICO number are placeholders
  (`components/Footer.jsx`); fill at cutover.
- 🟠 **VAT position** — Pro (digital service) vs travel commission; confirm with an accountant
  (`docs/compliance.md` §3).
- 🟡 **DSAR export delivery** — offline writes the zip to a temp path and logs it; set `S3_EXPORT_BUCKET`
  (+ AWS creds) and add `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` to deliver the 72h signed link
  by email. The PostHog/Sentry server-side person-delete on account deletion is not wired (client-side
  `posthog.reset()` on sign-out only) — add the provider delete calls when those SDKs are server-side.
- 🟡 **`APP_SALT`** — set a real secret in prod (used to hash IPs on legal-acceptance records); the dev
  default must not ship.
