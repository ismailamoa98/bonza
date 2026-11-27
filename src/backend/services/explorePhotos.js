// services/explorePhotos.js — Phase 18. High-quality, recognisable landmark photos for the Explore drawer
// gallery + list/grid thumbnails. Primary source is the Wikipedia lead image of each landmark's article
// (curated, unmistakably the place, ~1280px) via the keyless MediaWiki API; falls back to Openverse (CC image
// search) and, when a key is set, prefers Unsplash. All sources cached in memory (24h). Never throws — returns
// [] (gradient fallback) on any error. The many list/grid thumbnails are backfilled into the DB once
// (db/backfillExplorePhotos.js); only the drawer fetches live per city-open (results cached per city).
const axios = require("axios");
const env = require("../config/env");
const { logger } = require("../utils/logger");

const cache = new Map(); // key → { urls, at } (urls is always an array; single-photo helpers read [0])
const TTL = 1000 * 60 * 60 * 24; // 24h
const UA = "Bonza/1.0 (+https://bonza.travel; contact ismailamoa98@gmail.com)";

// ---- Wikipedia (primary: real landmark photos) --------------------------------------------------------
// Reject non-photo lead images (logos, maps, flags, icons, rendered SVGs) so a landmark always gets a photo.
const NOT_A_PHOTO = /(logo|icon|\bmap\b|flag|seal|coat[_-]?of[_-]?arms|locator|emblem|crest|\.svg)/i;
function isPhoto(url) {
  const u = url.toLowerCase();
  if (NOT_A_PHOTO.test(u)) return false;
  return /\.(jpe?g|png)(\/|$|\?)/.test(u) || u.includes("/thumb/");
}
// Normalise to the canonical upload host and drop tracking query params.
function cleanWiki(url) {
  return url.replace("//thumb.wikimedia.org/", "//upload.wikimedia.org/").split("?")[0];
}

async function fromWikipedia(query) {
  const res = await axios.get("https://en.wikipedia.org/w/api.php", {
    params: {
      action: "query", format: "json", generator: "search", gsrsearch: query, gsrlimit: 4,
      prop: "pageimages", piprop: "thumbnail", pithumbsize: 1280, origin: "*",
    },
    headers: { "User-Agent": UA },
    timeout: 6000,
  });
  const pages = Object.values(res.data?.query?.pages || {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  for (const p of pages) {
    const src = p.thumbnail?.source;
    if (src && isPhoto(src)) return cleanWiki(src);
  }
  return null;
}

// ---- Unsplash / Openverse (fallbacks) -----------------------------------------------------------------
async function fromUnsplash(q, n) {
  const res = await axios.get("https://api.unsplash.com/search/photos", {
    params: { query: q, per_page: n, orientation: "landscape", content_filter: "high" },
    headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
    timeout: 6000,
  });
  return (res.data?.results || []).map((r) => r.urls?.regular).filter(Boolean);
}

const HIRES_HOST = /(?:^|\.)(?:staticflickr\.com|upload\.wikimedia\.org|images\.unsplash\.com)$/i;
function bestUrl(r) {
  try {
    if (r.url && HIRES_HOST.test(new URL(r.url).hostname)) return r.url;
  } catch {
    /* fall through to the proxied thumbnail */
  }
  return r.thumbnail || r.url || null;
}

async function fromOpenverse(q, n) {
  const res = await axios.get("https://api.openverse.org/v1/images/", {
    params: { q, page_size: Math.max(n, 8), mature: false, aspect_ratio: "wide" },
    headers: { "User-Agent": UA },
    timeout: 6000,
  });
  return (res.data?.results || []).map(bestUrl).filter(Boolean).slice(0, n);
}

// photosFor(query, n) — generic city/landmark photos (Unsplash key → Unsplash, else Openverse). Cached.
async function photosFor(query, n = 5) {
  const q = String(query || "").trim();
  if (!q) return [];
  const key = `${q}::${n}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.urls;
  try {
    const urls = env.hasUnsplash ? await fromUnsplash(q, n) : await fromOpenverse(q, n);
    if (urls.length) cache.set(key, { urls, at: Date.now() });
    return urls;
  } catch (err) {
    logger.warn("Explore photo lookup failed", { query: q, source: env.hasUnsplash ? "unsplash" : "openverse", error: err.message });
    return []; // fail soft — gradient fallback rather than a broken image
  }
}

// One recognisable, high-quality photo of a single landmark: Wikipedia lead image first, then Unsplash/
// Openverse. Cached per landmark query.
async function landmarkPhoto(landmark, city) {
  const q = /\b(?:in|at)\b/i.test(landmark) || landmark.toLowerCase().includes(city.toLowerCase())
    ? landmark
    : `${landmark} ${city}`;
  const key = `LMP::${q}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.urls[0] || null;
  let url = null;
  try {
    url = await fromWikipedia(q);
  } catch (err) {
    logger.warn("Wikipedia landmark lookup failed", { query: q, error: err.message });
  }
  if (!url) url = (await photosFor(q, 1))[0] || null;
  if (url) cache.set(key, { urls: [url], at: Date.now() });
  return url;
}

// One photo for backfilling a stored list/grid thumbnail — the city's signature (first) landmark, else a
// generic city photo. Only the backfill script calls this (the list reads the stored DB imageUrl).
async function firstLandmarkPhoto({ landmarks = [], city, country }) {
  if (landmarks.length) {
    const url = await landmarkPhoto(landmarks[0], city);
    if (url) return url;
  }
  return (await photosFor(country ? `${city}, ${country}` : city, 1))[0] || null;
}

// Photos of a specific hotel for the drawer's click-through gallery: the named property first (Openverse has
// real interiors/rooms for many chain properties), topped up with generic chain-room shots so every hotel has
// a few. Cached per property. `chain` is a plain keyword ("Hyatt"/"Marriott"/"Hilton").
async function hotelPhotos(propertyName, chain, n = 6) {
  const key = `HOTEL::${propertyName}::${n}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.urls;

  const picks = [];
  const seen = new Set();
  const add = (arr) => {
    for (const u of arr || []) {
      if (u && !seen.has(u)) {
        seen.add(u);
        picks.push(u);
      }
      if (picks.length >= n) return;
    }
  };
  add(await photosFor(propertyName, n));
  if (picks.length < 3 && chain) add(await photosFor(`${chain} hotel room interior`, n));
  if (picks.length < 3) add(await photosFor("luxury hotel room", n));
  if (picks.length) cache.set(key, { urls: picks, at: Date.now() });
  return picks;
}

// A slideshow of a city's signature landmarks — one distinct, recognisable photo per landmark. Cached per
// city so repeat opens make no API calls. Tops up with a generic landmark query if too few resolve.
async function landmarkPhotos({ landmarks = [], city, country, n = 6 }) {
  const cityQ = country ? `${city}, ${country}` : city;
  const cacheKey = `LM::${cityQ}::${n}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL) return hit.urls;

  const picks = [];
  const seen = new Set();
  for (const lm of landmarks.slice(0, n)) {
    const url = await landmarkPhoto(lm, city);
    if (url && !seen.has(url)) {
      seen.add(url);
      picks.push(url);
    }
    if (picks.length >= n) break;
  }
  if (picks.length < Math.min(3, n)) {
    for (const url of await photosFor(`${cityQ} landmark`, n)) {
      if (!seen.has(url)) {
        seen.add(url);
        picks.push(url);
      }
      if (picks.length >= n) break;
    }
  }
  if (picks.length) cache.set(cacheKey, { urls: picks, at: Date.now() });
  return picks;
}

module.exports = { photosFor, firstLandmarkPhoto, landmarkPhoto, landmarkPhotos, hotelPhotos };
