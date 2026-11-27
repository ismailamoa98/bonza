// utils/siteUrl.js — Phase 23 SEO. The canonical production origin for <link rel="canonical"> and og:url,
// pinned via VITE_SITE_URL so canonicals never self-reference a preview/staging host (which would otherwise
// get those URLs indexed). Falls back to the production domain when the env var isn't set.
export const SITE_URL = String(import.meta.env?.VITE_SITE_URL || "https://bonza.app").replace(/\/+$/, "");

// canonicalUrl("/explore/PT") -> "https://bonza.app/explore/PT"
export function canonicalUrl(path = "/") {
  const p = String(path || "/");
  return `${SITE_URL}${p.startsWith("/") ? p : `/${p}`}`;
}
