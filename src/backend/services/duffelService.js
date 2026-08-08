// services/duffelService.js — cash inventory via Duffel (flights + Stays).
// Wrappers branch on env.hasDuffel: real token → live API, else map the mock
// inventory into the same response shape. @duffel/api is lazy-required (only when
// hasDuffel) so a missing package/key never breaks boot.
const env = require("../config/env");
const { getFlights } = require("../utils/mockFlights");
const { getHotels } = require("../utils/mockHotels");

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

  return response.data.offers.slice(0, 20).map((offer) => ({
    duffelOfferId: offer.id,
    totalAmount: parseFloat(offer.total_amount),
    currency: offer.total_currency,
    slices: offer.slices.map((s) => ({
      origin: s.origin.iata_code,
      destination: s.destination.iata_code,
      duration: s.duration,
      segments: s.segments.map((seg) => ({
        carrier: seg.marketing_carrier.name,
        flightNumber: seg.marketing_carrier_flight_number,
        departure: seg.departing_at,
        arrival: seg.arriving_at,
      })),
    })),
  }));
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
  const key = String(location || "").toLowerCase();
  const hit = Object.keys(CITY_COORDS).find((c) => key.includes(c));
  if (hit) return CITY_COORDS[hit];
  throw new Error("Duffel Stays needs coordinates ({latitude, longitude}) or a known city");
}

async function duffelSearchHotels({ location, checkIn, checkOut, adults, rooms }) {
  const duffel = getDuffel();
  const results = await duffel.stays.search({
    location: { radius: 5, geographic_coordinates: resolveCoords(location) },
    check_in_date: checkIn,
    check_out_date: checkOut,
    rooms: rooms || 1,
    guests: Array(adults || 1).fill({ type: "adult" }),
  });

  // Result fields are nested under `accommodation`; rate is on the result.
  return results.data.results.slice(0, 20).map((r) => ({
    duffelHotelId: r.id,
    name: r.accommodation?.name,
    starRating: r.accommodation?.rating,
    location: r.accommodation?.location,
    lowestRate: r.cheapest_rate_total_amount,
    currency: r.cheapest_rate_currency,
    imageUrl: r.accommodation?.photos?.[0]?.url || null,
  }));
}

// ── Mock fallback (offline / dev) — same response shapes as the real path ──────

// ISO-8601 duration ("PT8H") between two ISO timestamps.
function isoDuration(departISO, arriveISO) {
  const ms = new Date(arriveISO).getTime() - new Date(departISO).getTime();
  const hours = Math.max(1, Math.round(ms / 3600000));
  return `PT${hours}H`;
}

function flightToSlice(f, origin, destination) {
  return {
    origin: origin || f.from,
    destination: destination || f.to,
    duration: isoDuration(f.departureTime, f.arrivalTime),
    segments: [
      {
        carrier: f.airline,
        flightNumber: f.flightNumber,
        departure: f.departureTime,
        arrival: f.arrivalTime,
      },
    ],
  };
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
  return getHotels(location, checkIn)
    .slice(0, 20)
    .map((h) => ({
      duffelHotelId: `mock_${h.id}`,
      name: h.name,
      starRating: h.stars,
      location: { city: h.city },
      lowestRate: h.pricePerNight,
      currency: "GBP",
      imageUrl: h.imageUrl || null,
    }));
}

// ── Public wrappers (callers don't care which path ran) ────────────────────────

function searchFlights(params) {
  return env.hasDuffel ? duffelSearchFlights(params) : Promise.resolve(mockSearchFlights(params));
}

function confirmFlightPrice(offerId) {
  return env.hasDuffel ? duffelConfirmFlightPrice(offerId) : Promise.resolve(mockConfirmFlightPrice(offerId));
}

function searchHotels(params) {
  return env.hasDuffel ? duffelSearchHotels(params) : Promise.resolve(mockSearchHotels(params));
}

module.exports = { searchFlights, confirmFlightPrice, bookFlight, bookCashFlight, searchHotels };
