// services/duffelService.js — cash inventory via Duffel (flights + Stays).
// Wrappers branch on env.hasDuffel: real token → live API, else map the mock
// inventory into the same response shape. @duffel/api is lazy-required (only when
// hasDuffel) so a missing package/key never breaks boot.
const env = require("../config/env");
const { getFlights } = require("../utils/mockFlights");
const { getHotels } = require("../utils/mockHotels");
const { resolveAirport, airportInfo } = require("../utils/airportSearch");
const { logger } = require("../utils/logger");

let _duffel = null;
function getDuffel() {
  if (!_duffel) {
    const { Duffel } = require("@duffel/api");
    _duffel = new Duffel({ token: process.env.DUFFEL_API_KEY });
  }
  return _duffel;
}

// ── Real Duffel path ─────────────────────────────────────────────────────────

async function duffelSearchFlights({ origin, destination, departureDate, returnDate, adults }) {
  const duffel = getDuffel();
  const slices = [{ origin, destination, departure_date: departureDate }];
  if (returnDate) slices.push({ origin: destination, destination: origin, departure_date: returnDate });

  const response = await duffel.offerRequests.create({
    slices,
    passengers: Array(adults || 1).fill({ type: "adult" }),
    cabin_class: "economy",
    return_offers: true,
  });

  // Airport endpoints as { code, city, name } for the planner UI (Duffel gives city_name/name inline).
  const ptToInfo = (pt) =>
    pt ? { code: pt.iata_code, city: pt.city_name || pt.city?.name || pt.iata_code, name: pt.name || pt.iata_code } : null;

  return response.data.offers.slice(0, 20).map((offer) => {
    const firstSlice = offer.slices?.[0];
    const firstSeg = firstSlice?.segments?.[0];
    return {
      duffelOfferId: offer.id,
      totalAmount: parseFloat(offer.total_amount),
      currency: offer.total_currency,
      slices: offer.slices.map((s) => ({
        origin: ptToInfo(s.origin),
        destination: ptToInfo(s.destination),
        duration: s.duration,
        stops: Math.max(0, (s.segments?.length || 1) - 1),
        segments: s.segments.map((seg) => ({
          origin: ptToInfo(seg.origin),
          destination: ptToInfo(seg.destination),
          carrier: seg.marketing_carrier?.name,
          carrierCode: seg.marketing_carrier?.iata_code,
          flightNumber: seg.marketing_carrier_flight_number,
          aircraft: seg.aircraft?.name || null,
          departure: seg.departing_at,
          arrival: seg.arriving_at,
        })),
      })),
      // Fare attributes (best-effort) so the search UI can filter + brand flights.
      airline: firstSeg?.marketing_carrier?.name || null,
      airlineCode: firstSeg?.marketing_carrier?.iata_code || null,
      cabin: firstSeg?.passengers?.[0]?.cabin_class || null,
      stops: firstSlice ? Math.max(0, (firstSlice.segments?.length || 1) - 1) : 0,
      refundable: !!offer.conditions?.refund_before_departure?.allowed,
    };
  });
}

async function duffelConfirmFlightPrice(offerId) {
  const duffel = getDuffel();
  // An offer id (off_…) is read via offers.get — NOT offerRequests.get (that
  // takes an offer-request id and has no total_amount). The offer carries the
  // current price + expiry used to re-confirm before booking.
  const response = await duffel.offers.get(offerId);
  return {
    offerId,
    totalAmount: parseFloat(response.data.total_amount),
    currency: response.data.total_currency,
    stillAvailable: response.data.expires_at > new Date().toISOString(),
  };
}

async function bookFlight({ offerId, passengers, paymentIntentId }) {
  // Offline / no key → deterministic mock order (mirrors searchFlights/confirmFlightPrice)
  // so the on-site booking flow is testable without a Duffel account.
  if (!env.hasDuffel) return mockBookFlight({ offerId });

  const duffel = getDuffel();
  const order = await duffel.orders.create({
    selected_offers: [offerId],
    passengers,
    payments: [{ type: "balance", amount: "0", currency: "GBP" }],
    metadata: { bonza_payment_intent: paymentIntentId },
  });

  return {
    duffelOrderId: order.data.id,
    bookingReference: order.data.booking_reference,
    status: order.data.payment_status.awaiting_payment ? "pending" : "confirmed",
  };
}

// Resolve a fresh, bookable Duffel offer for a route/date at confirm time, then book it.
// Needed because the optimize grids source flights from browse inventory (no Duffel offer
// id) and Duffel offers expire — so we re-search + re-price against the live API before
// ordering. Offline this shortcuts straight to the mock order. `preferAmount` picks the
// offer closest to the price the user saw, otherwise the cheapest.
async function bookCashFlight({
  origin, destination, departureDate, returnDate, adults, passengers, paymentIntentId, preferAmount,
}) {
  if (!env.hasDuffel) {
    return { order: mockBookFlight({ offerId: `mock_${origin}_${destination}` }), offer: null };
  }

  const offers = await duffelSearchFlights({ origin, destination, departureDate, returnDate, adults });
  if (!offers.length) throw new Error("No Duffel offers available for this route/date");

  const chosen = preferAmount != null
    ? offers.reduce((best, o) =>
        Math.abs(o.totalAmount - preferAmount) < Math.abs(best.totalAmount - preferAmount) ? o : best)
    : offers.reduce((best, o) => (o.totalAmount < best.totalAmount ? o : best));

  const priced = await duffelConfirmFlightPrice(chosen.duffelOfferId);
  if (!priced.stillAvailable) throw new Error("Selected Duffel offer is no longer available");

  const order = await bookFlight({ offerId: chosen.duffelOfferId, passengers, paymentIntentId });
  return { order, offer: { offerId: chosen.duffelOfferId, totalAmount: priced.totalAmount, currency: priced.currency } };
}

// Approx coordinates for the demo cities so a city-string location can drive a
// real Stays search (which requires lat/long, not a city name).
const CITY_COORDS = {
  london: { latitude: 51.5074, longitude: -0.1278 },
  paris: { latitude: 48.8566, longitude: 2.3522 },
  "new york": { latitude: 40.7128, longitude: -74.006 },
  lisbon: { latitude: 38.7223, longitude: -9.1393 },
  dubai: { latitude: 25.2048, longitude: 55.2708 },
  tokyo: { latitude: 35.6762, longitude: 139.6503 },
};

function resolveCoords(location) {
  if (
    location && typeof location === "object" &&
    typeof location.latitude === "number" && typeof location.longitude === "number"
  ) {
    return { latitude: location.latitude, longitude: location.longitude };
  }
  const raw = String(location || "").trim();
  // Airport code (e.g. "LHR") → the serving city's coordinates.
  const airport = resolveAirport(raw);
  if (airport) return { latitude: airport.latitude, longitude: airport.longitude };
  // City name (e.g. "London", or "CDG — Paris") → known-city coordinates.
  const key = raw.toLowerCase();
  const hit = Object.keys(CITY_COORDS).find((c) => key.includes(c));
  if (hit) return CITY_COORDS[hit];
  throw new Error("Duffel Stays needs coordinates ({latitude, longitude}) or a known city");
}

async function duffelSearchHotels({ location, checkIn, checkOut, adults, rooms }) {
  const duffel = getDuffel();
  const results = await duffel.stays.search({
    // City-centre coords (see airportSearch) with a metro-wide radius so we get city hotels, not just
    // properties on the airport apron.
    location: { radius: 25, geographic_coordinates: resolveCoords(location) },
    check_in_date: checkIn,
    check_out_date: checkOut,
    rooms: rooms || 1,
    guests: Array(adults || 1).fill({ type: "adult" }),
  });

  // Result fields are nested under `accommodation`; rate is on the result.
  return results.data.results.slice(0, 20).map((r) => {
    const acc = r.accommodation || {};
    const photos = (acc.photos || []).map((p) => p.url).filter(Boolean);
    return {
      duffelHotelId: r.id,
      name: acc.name,
      starRating: acc.rating,
      // Guest review score (0–10), distinct from the star rating, when Duffel provides one.
      rating: acc.review_score ?? acc.ratings?.[0]?.value ?? null,
      location: acc.location, // includes { address, geographic_coordinates }
      lowestRate: r.cheapest_rate_total_amount,
      currency: r.cheapest_rate_currency,
      amenities: (acc.amenities || []).map((a) => a.description || a.type).filter(Boolean),
      description: acc.description || null,
      photos,
      imageUrl: photos[0] || null,
      // Genuine only — never fabricated. Search results rarely carry the full cancellation timeline
      // (that needs a rate-detail fetch, future); default false so the "free cancellation" badge stays
      // dark unless the supplier truly reports a refundable rate.
      freeCancellation: isRefundableRate(r.cheapest_rate),
    };
  });
}

// True only when a Duffel rate genuinely signals a free-cancellation / refundable window. Defensive:
// returns false whenever the signal is absent (which is the common case in search results).
function isRefundableRate(rate) {
  if (!rate || typeof rate !== "object") return false;
  if (rate.conditions?.refund_before_deadline) return true;
  const timeline = rate.cancellation_timeline;
  if (Array.isArray(timeline)) {
    return timeline.some(
      (t) => Number(t?.refund_amount) > 0 && new Date(t?.before || 0) > new Date()
    );
  }
  return false;
}

// ── Mock fallback (offline / dev) — same response shapes as the real path ──────

// Generic connecting hubs used to synthesise realistic layovers for the mock (demo inventory only —
// real segments come from Duffel). The carrier's own hub is preferred first.
const HUB_POOL = ["AMS", "FRA", "DOH", "DXB", "SIN", "MAD", "AUH"];

function pickHubs(f, originCode, destCode) {
  const used = new Set([originCode, destCode]);
  const hubs = [];
  for (const h of [f.hub, ...HUB_POOL]) {
    if (hubs.length >= (f.stops || 0)) break;
    if (h && !used.has(h)) {
      hubs.push(h);
      used.add(h);
    }
  }
  return hubs;
}

// Build a realistic multi-segment slice from a mock flight: origin → [hub…] → destination, splitting the
// total journey time into flying legs separated by ~90-min layovers. Each segment carries its own
// airports, times, carrier, flight number and aircraft so the planner UI can show a full itinerary.
function flightToSlice(f, originCode, destCode) {
  const oCode = originCode || f.from;
  const dCode = destCode || f.to;
  const stops = f.stops || 0;
  const codes = [oCode, ...pickHubs(f, oCode, dCode), dCode];
  const nSeg = codes.length - 1;

  const dep = new Date(f.departureTime).getTime();
  const arr = new Date(f.arrivalTime).getTime();
  const LAYOVER = 90 * 60 * 1000; // 1h30 per connection
  const total = Math.max(nSeg * 3600000 + stops * LAYOVER, arr - dep);
  const legMs = Math.round((total - stops * LAYOVER) / nSeg);
  const baseNo = parseInt(String(f.flightNumber).replace(/\D/g, ""), 10) || 100;

  const segments = [];
  let cursor = dep;
  for (let s = 0; s < nSeg; s++) {
    const segDep = cursor;
    const segArr = s === nSeg - 1 ? dep + total : segDep + legMs;
    segments.push({
      origin: airportInfo(codes[s]),
      destination: airportInfo(codes[s + 1]),
      carrier: f.airline,
      carrierCode: f.airlineCode,
      flightNumber: `${f.airlineCode || "XX"}${baseNo + s}`,
      aircraft: f.aircraft || null,
      departure: new Date(segDep).toISOString(),
      arrival: new Date(segArr).toISOString(),
    });
    cursor = segArr + LAYOVER;
  }

  return { origin: airportInfo(oCode), destination: airportInfo(dCode), stops, segments };
}

function mockSearchFlights({ origin, destination, departureDate, returnDate }) {
  const out = getFlights(origin, destination, departureDate);
  const back = returnDate ? getFlights(destination, origin, returnDate) : null;

  return out.slice(0, 20).map((f, i) => {
    const slices = [flightToSlice(f, origin, destination)];
    if (back) {
      const r = back[i % back.length];
      slices.push(flightToSlice(r, destination, origin));
    }
    return {
      duffelOfferId: `mock_${f.id}`,
      totalAmount: f.basePrice + (returnDate ? f.basePrice : 0),
      currency: "GBP",
      slices,
      // Filterable + brandable fare attributes (dropped before — the search UI needs these).
      airline: f.airline,
      airlineCode: f.airlineCode,
      cabin: f.cabin,
      stops: f.stops,
      refundable: f.refundable,
      baggageIncluded: f.baggageIncluded,
    };
  });
}

function mockConfirmFlightPrice(offerId) {
  return { offerId, stillAvailable: true, currency: "GBP" };
}

// Deterministic mock order — same shape as the real bookFlight result. The reference is
// derived from the offer id so repeat runs are stable (no Date.now/random).
function mockBookFlight({ offerId }) {
  const seed = String(offerId || "mock").replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase().padStart(6, "X");
  return { duffelOrderId: `mock_ord_${offerId}`, bookingReference: `BONZA-${seed}`, status: "confirmed" };
}

function mockSearchHotels({ location, checkIn }) {
  // City-centre coords for the whole result set so the detail-panel map has something to show; the mock
  // inventory has no per-property coordinates. Unknown city → omit coords (map falls back to a placeholder).
  let coords = null;
  try {
    coords = resolveCoords(location);
  } catch {
    /* unknown city — leave coords null */
  }
  return getHotels(location, checkIn)
    .slice(0, 20)
    .map((h) => ({
      duffelHotelId: `mock_${h.id}`,
      name: h.name,
      starRating: h.stars,
      rating: h.rating,
      location: { city: h.city, ...(coords ? { geographic_coordinates: coords } : {}) },
      lowestRate: h.pricePerNight,
      currency: "GBP",
      amenities: h.benefits || [],
      propertyType: h.propertyType || null,
      freeCancellation: !!h.freeCancellation,
      breakfastIncluded: !!h.breakfastIncluded,
      imageUrl: h.imageUrl || null,
    }));
}

// ── Public wrappers (callers don't care which path ran) ────────────────────────

// Same resilience as searchHotels: try live Duffel when a key is present, but fall back to the mock
// inventory if it throws (e.g. an invalid token) or returns nothing, so the flights grid is never empty.
async function searchFlights(params) {
  if (!env.hasDuffel) return mockSearchFlights(params);
  try {
    const real = await duffelSearchFlights(params);
    if (real && real.length) return real;
    logger.warn("Duffel flight search returned no offers — falling back to mock", {
      route: `${params?.origin}-${params?.destination}`,
    });
  } catch (err) {
    logger.warn("Duffel flight search failed — falling back to mock", {
      route: `${params?.origin}-${params?.destination}`,
      error: err.message || err?.errors?.[0]?.title,
    });
  }
  return mockSearchFlights(params);
}

function confirmFlightPrice(offerId) {
  return env.hasDuffel ? duffelConfirmFlightPrice(offerId) : Promise.resolve(mockConfirmFlightPrice(offerId));
}

// Real Duffel Stays when a key is present, but never let it blank the grid: if the live search throws
// (e.g. an unresolvable destination) or returns nothing (sparse test-mode inventory), fall back to the
// deterministic mock inventory. Offline (no key) goes straight to mock.
async function searchHotels(params) {
  if (!env.hasDuffel) return mockSearchHotels(params);
  try {
    const real = await duffelSearchHotels(params);
    if (real && real.length) return real;
    logger.warn("Duffel Stays returned no hotels — falling back to mock", { location: params?.location });
  } catch (err) {
    logger.warn("Duffel Stays search failed — falling back to mock", {
      location: params?.location,
      error: err.message,
    });
  }
  return mockSearchHotels(params);
}

module.exports = { searchFlights, confirmFlightPrice, bookFlight, bookCashFlight, searchHotels };
