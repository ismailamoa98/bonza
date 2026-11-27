// seo.test.jsx — Phase 23. The SEO head plumbing: canonicalUrl pins the production origin, and useHead
// upserts title/description/canonical and keeps og:url in step with the canonical.
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useHead } from "./useHead.js";
import { canonicalUrl, SITE_URL } from "./siteUrl.js";

function Probe(props) {
  useHead(props);
  return null;
}

const head = (sel) => document.head.querySelector(sel);

afterEach(cleanup);

describe("canonicalUrl", () => {
  it("builds an absolute URL on the pinned site origin", () => {
    expect(canonicalUrl("/explore")).toBe(`${SITE_URL}/explore`);
    expect(canonicalUrl("explore/PT")).toBe(`${SITE_URL}/explore/PT`);
    expect(SITE_URL).not.toMatch(/vercel\.app|localhost/); // never a preview/local host
  });
});

describe("useHead", () => {
  it("sets title, description, canonical and a matching og:url", () => {
    render(<Probe title="T" description="D" canonical="https://bonza.app/x" />);
    expect(document.title).toBe("T");
    expect(head('meta[name="description"]').getAttribute("content")).toBe("D");
    expect(head('link[rel="canonical"]').getAttribute("href")).toBe("https://bonza.app/x");
    expect(head('meta[property="og:url"]').getAttribute("content")).toBe("https://bonza.app/x");
    expect(head('meta[property="og:title"]').getAttribute("content")).toBe("T");
  });

  it("restores the previous title on unmount", () => {
    document.title = "Original";
    const { unmount } = render(<Probe title="Temp" />);
    expect(document.title).toBe("Temp");
    unmount();
    expect(document.title).toBe("Original");
  });
});
