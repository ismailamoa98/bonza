// db/backfillExplorePhotos.js — one-off backfill of ExploreCountry/ExploreCity.imageUrl so the /explore map
// list + grid and the /explore/:code city cards show real, recognisable landmark thumbnails at zero runtime
// cost (the drawer still fetches a fresh slideshow live). Cities use their signature landmark's Wikipedia lead
// image (via firstLandmarkPhoto); countries use a generic photo. Throttled under the API burst caps; only
// fills rows that need it. Curated local seeds ("/cities/…", "/explore/…", "/auth/…") are never overwritten.
//   node src/backend/db/backfillExplorePhotos.js          # fill only missing (null) images
//   node src/backend/db/backfillExplorePhotos.js --force   # also re-fetch non-Wikimedia URLs (upgrade them)
const prisma = require("../config/database");
const { firstLandmarkPhoto, photosFor } = require("../services/explorePhotos");
const { landmarksFor } = require("./cityLandmarks");
const { logger } = require("../utils/logger");

const DELAY_MS = 850; // ~70/min, under the burst caps
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FORCE = process.argv.includes("--force");
const isLocal = (url) => url && !/^https?:/i.test(url); // "/cities/…" seed → never overwrite
const isWiki = (url) => url && url.includes("upload.wikimedia.org"); // already a Wikipedia landmark shot
// Without --force: only null. With --force: also any non-local, non-Wikimedia URL (upgrade it to Wikipedia).
const needs = (url) => url == null || (FORCE && !isLocal(url) && !isWiki(url));

async function backfill() {
  const allCountries = await prisma.exploreCountry.findMany({ select: { code: true, name: true, imageUrl: true } });
  const allCities = await prisma.exploreCity.findMany({
    select: { id: true, name: true, iataCode: true, imageUrl: true, country: { select: { name: true } } },
  });
  const countries = allCountries.filter((c) => needs(c.imageUrl));
  const cities = allCities.filter((c) => needs(c.imageUrl));

  const jobs = [
    ...countries.map((c) => ({ kind: "country", id: c.code, label: c.name, fetch: () => photosFor(c.name, 1).then((u) => u[0] || null) })),
    ...cities.map((c) => ({
      kind: "city",
      id: c.id,
      label: c.name,
      fetch: () => firstLandmarkPhoto({ landmarks: landmarksFor(c.iataCode), city: c.name, country: c.country.name }),
    })),
  ];

  console.log(`Backfilling photos: ${countries.length} countries + ${cities.length} cities = ${jobs.length} lookups (~${Math.ceil((jobs.length * DELAY_MS) / 60000)} min).`);

  let ok = 0;
  let miss = 0;
  for (const [i, job] of jobs.entries()) {
    const url = await job.fetch().catch(() => null);
    if (url) {
      if (job.kind === "country") await prisma.exploreCountry.update({ where: { code: job.id }, data: { imageUrl: url } });
      else await prisma.exploreCity.update({ where: { id: job.id }, data: { imageUrl: url } });
      ok++;
    } else {
      miss++;
      console.warn(`  · no photo for ${job.kind} "${job.label}"`);
    }
    if ((i + 1) % 10 === 0 || i === jobs.length - 1) console.log(`  ${i + 1}/${jobs.length} — ${ok} set, ${miss} missed`);
    if (i < jobs.length - 1) await sleep(DELAY_MS);
  }

  console.log(`Done: ${ok} images set, ${miss} missed (kept previous/gradient).`);
}

backfill()
  .catch((e) => {
    logger.error("Explore photo backfill failed", { error: e.message });
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
