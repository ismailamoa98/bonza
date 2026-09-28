// utils/useHead.js — Phase 19. A tiny, dependency-free document-head manager (the app has none otherwise).
// Sets the title, upserts <meta name/property>, a canonical <link>, and a single JSON-LD <script>; restores
// or removes what it added on unmount. Client-rendered, so this serves JS-executing crawlers (e.g. Googlebot).
import { useEffect } from "react";

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  const created = !el;
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return { el, created };
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  const created = !el;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  const prev = el.getAttribute("href");
  el.setAttribute("href", href);
  return { el, created, prev };
}

// useHead({ title, description, canonical, ogImage, jsonLd }) — any field may be undefined/null and is skipped.
export function useHead({ title, description, canonical, ogImage, ogTitle, jsonLd } = {}) {
  useEffect(() => {
    const prevTitle = document.title;
    const cleanups = [];

    if (title) document.title = title;

    const metas = [];
    if (description) metas.push(['meta[name="description"]', { name: "description", content: description }]);
    if (ogTitle || title) metas.push(['meta[property="og:title"]', { property: "og:title", content: ogTitle || title }]);
    if (description) metas.push(['meta[property="og:description"]', { property: "og:description", content: description }]);
    if (ogImage) metas.push(['meta[property="og:image"]', { property: "og:image", content: ogImage }]);
    metas.push(['meta[property="og:type"]', { property: "og:type", content: "website" }]);

    for (const [selector, attrs] of metas) {
      const { el, created } = upsertMeta(selector, attrs);
      const prevContent = created ? null : el.getAttribute("content");
      cleanups.push(() => (created ? el.remove() : prevContent != null && el.setAttribute("content", prevContent)));
    }

    if (canonical) {
      const { el, created, prev } = upsertLink("canonical", canonical);
      cleanups.push(() => (created ? el.remove() : prev != null && el.setAttribute("href", prev)));
    }

    let scriptEl;
    if (jsonLd) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.textContent = JSON.stringify(jsonLd);
      scriptEl.setAttribute("data-head", "explore");
      document.head.appendChild(scriptEl);
    }

    return () => {
      document.title = prevTitle;
      cleanups.forEach((fn) => fn());
      scriptEl?.remove();
    };
  }, [title, description, canonical, ogImage, ogTitle, JSON.stringify(jsonLd)]);
}
