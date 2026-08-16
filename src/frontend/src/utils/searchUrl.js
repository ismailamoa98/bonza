// utils/searchUrl.js — build/read the /search query-string. All search state lives in the URL so a
// results page is shareable and reloadable; dates travel as a single `dep_ret` pair.
export function buildSearchUrl({
  origin,
  destination,
  departureDate,
  returnDate,
  dates, // optional pre-joined "dep_ret"
  travelers = 2,
  style = "points_max",
  packageId = null,
  cabin,
}) {
  const params = new URLSearchParams();
  if (origin) params.set("from", origin);
  if (destination) params.set("to", destination);
  const range = dates || [departureDate, returnDate].filter(Boolean).join("_");
  if (range) params.set("dates", range);
  params.set("travelers", String(travelers));
  if (style) params.set("style", style);
  if (cabin && cabin !== "economy") params.set("cabin", cabin);
  if (packageId) params.set("packageId", packageId);
  return `/search?${params.toString()}`;
}

// Read the search params off a URLSearchParams into the shape the search hook + API expect.
export function parseSearchParams(searchParams) {
  const dates = searchParams.get("dates") || "";
  const [departureDate = "", returnDate = ""] = dates.split("_");
  return {
    origin: searchParams.get("from") || "",
    destination: searchParams.get("dest") || searchParams.get("to") || "",
    departureDate,
    returnDate,
    travelers: parseInt(searchParams.get("travelers") || "2", 10),
    style: searchParams.get("style") || "points_max",
    cabin: searchParams.get("cabin") || "economy",
    packageId: searchParams.get("packageId") || null,
  };
}
