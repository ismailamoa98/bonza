// services/googlePlacesService.js — genuine property reviews via the Google Places API (New).
// Gated on env.hasGooglePlaces: with a key we fetch a real rating + up to 5 reviews for the matched
// place; without one we return { source: "mock" } so the frontend shows clearly-labelled sample data.
//
// ToS notes: the key stays server-side, we surface Google attribution + per-review author/relative time
// in the UI, and review text is NOT persisted — only a short in-memory cache (place match + payload) is
// kept to respect rate limits. Never throws (a failure degrades to matched:false).
const axios = require("axios");
const env = require("../config/env");
const { logger } = require("../utils/logger");

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK =
  "places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.reviews," +
  "places.formattedAddress,places.editorialSummary,places.location";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — rate-limit relief, not long-term storage of review text.
const cache = new Map(); // key -> { at, data }

// Normalise a name to comparable tokens ("The Ritz London Hotel" -> ["ritz","london","hotel"]).
function tokens(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

// The found place is genuine for our hotel if its name shares enough distinctive tokens with the query.
function isMatch(hotelName, placeName) {
  const a = tokens(hotelName);
  const b = new Set(tokens(placeName));
  if (!a.length || !b.size) return false;
  const overlap = a.filter((t) => b.has(t)).length;
  return overlap >= Math.min(2, a.length); // at least 2 shared tokens (or all, for very short names)
}

function normaliseReview(rv) {
  return {
    author: rv?.authorAttribution?.displayName || "Google user",
    authorUri: rv?.authorAttribution?.uri || null,
    photo: rv?.authorAttribution?.photoUri || null,
    rating: rv?.rating ?? null,
    text: rv?.text?.text || rv?.originalText?.text || "",
    relativeTime: rv?.relativePublishTimeDescription || "",
  };
}

async function getPropertyReviews({ name, city, latitude, longitude }) {
  if (!env.hasGooglePlaces) return { source: "mock" };
  if (!name) return { source: "google", matched: false };

  const key = `${String(name).toLowerCase()}|${String(city || "").toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const body = { textQuery: [name, city].filter(Boolean).join(" "), maxResultCount: 1 };
  if (typeof latitude === "number" && typeof longitude === "number") {
    body.locationBias = { circle: { center: { latitude, longitude }, radius: 2000 } };
  }

  let data;
  try {
    const res = await axios.post(SEARCH_URL, body, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      timeout: 6000,
    });

    const place = res.data?.places?.[0];
    if (!place || !isMatch(name, place.displayName?.text)) {
      data = { source: "google", matched: false };
    } else {
      data = {
        source: "google",
        matched: true,
        placeId: place.id || null,
        rating: place.rating ?? null,
        total: place.userRatingCount ?? 0,
        mapsUri: place.googleMapsUri || null,
        address: place.formattedAddress || null,
        summary: place.editorialSummary?.text || null,
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        reviews: (place.reviews || []).map(normaliseReview),
      };
    }
  } catch (err) {
    logger.warn("Google Places review lookup failed", {
      name,
      error: err.response?.data?.error?.message || err.message,
    });
    data = { source: "google", matched: false };
  }

  cache.set(key, { at: Date.now(), data });
  return data;
}

module.exports = { getPropertyReviews };
