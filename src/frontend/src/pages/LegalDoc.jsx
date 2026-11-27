// pages/LegalDoc.jsx — Phase 25 §25c. Renders the versioned legal documents (src/content/legal/*) as
// markdown in a single-column prose layout with a sticky table of contents (lg+) built from the h2s.
// Routes: /legal/:doc (current), /legal/:doc/:version (historical), /legal/:doc/changes (LegalChanges, the
// version list). Explicit heading anchors written as `## Heading {#id}` are honoured so cross-doc links like
// /legal/terms#points-agency and /legal/booking-terms#refunds resolve; otherwise an id is slugified from the
// heading text. Documents are shipped Markdown + frontmatter, not DB rows, so every version stays addressable.
import { useEffect, useMemo } from "react";
import { useParams, useLocation, Link, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LEGAL_DOCS, currentVersion, findVersion } from "../content/legal";
import { parseFrontmatter } from "../utils/frontmatter";
import { useHead } from "../utils/useHead";
import { canonicalUrl } from "../utils/siteUrl";

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Pull the plain text out of react-markdown's rendered children (string | array | element).
function nodeText(children) {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(nodeText).join("");
  if (children && typeof children === "object" && children.props) return nodeText(children.props.children);
  return "";
}

// Scan the raw markdown for h2/h3 lines, in document order, capturing an explicit `{#id}` or a slug.
function extractHeadings(body) {
  const out = [];
  for (const line of body.split("\n")) {
    const m = /^(#{2,3})\s+(.*)$/.exec(line);
    if (!m) continue;
    const level = m[1].length;
    let text = m[2].trim();
    const explicit = /\{#([\w-]+)\}\s*$/.exec(text);
    const id = explicit ? explicit[1] : slugify(text.replace(/\{#[\w-]+\}\s*$/, "").trim());
    out.push({ level, text: text.replace(/\{#[\w-]+\}\s*$/, "").trim(), id });
  }
  return out;
}

// Remove the `{#id}` markers so they don't render as literal text.
const stripAnchors = (body) => body.replace(/\s*\{#[\w-]+\}\s*$/gm, "");

const DocBanner = () => (
  <p className="mt-5 rounded-xl border border-[#ece7df] bg-[#FBFAF8] px-4 py-3 text-[13px] italic text-ink-muted">
    This is a draft template, not legal advice. It must be reviewed by legal counsel — and completed with
    Bonza&rsquo;s registered entity, jurisdiction, ICO registration and contact details — before launch.
  </p>
);

export default function LegalDoc() {
  const { doc, version } = useParams();
  const { hash } = useLocation();
  const entry = LEGAL_DOCS[doc];

  const picked = version ? findVersion(doc, version) : currentVersion(doc);
  const { meta, body } = useMemo(() => (picked ? parseFrontmatter(picked.raw) : { meta: {}, body: "" }), [picked]);
  const headings = useMemo(() => extractHeadings(body), [body]);
  const cleanBody = useMemo(() => stripAnchors(body), [body]);

  const title = entry?.title || "Legal";
  const canonical = canonicalUrl(version ? `/legal/${doc}/${version}` : `/legal/${doc}`);
  useHead({
    title: `${title} | Bonza`,
    description: meta.summary || `${title} for Bonza.`,
    canonical,
    // Pin indexing to the current version; historical snapshots shouldn't compete for the query.
    robots: version ? "noindex,follow" : undefined,
  });

  // Scroll to an #anchor once the markdown is on the page.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
  }, [hash, cleanBody]);

  if (!entry) return <Navigate to="/legal/privacy" replace />;
  if (version && !picked) return <Navigate to={`/legal/${doc}`} replace />;

  // Assign ids to headings in document order as react-markdown renders them (synchronous render pass).
  let hi = 0;
  const components = {
    h2: ({ children }) => {
      const id = headings[hi]?.id || slugify(nodeText(children));
      hi += 1;
      return <h2 id={id}>{children}</h2>;
    },
    h3: ({ children }) => {
      const id = headings[hi]?.id || slugify(nodeText(children));
      hi += 1;
      return <h3 id={id}>{children}</h3>;
    },
  };

  const toc = headings.filter((h) => h.level === 2);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <nav className="text-[13px] font-semibold text-ink-soft">
        <Link to="/legal/privacy" className="hover:text-ink">Legal</Link>
        <span className="px-2 text-ink-muted">/</span>
        <span className="text-ink">{title}</span>
      </nav>

      <div className="mt-4 lg:grid lg:grid-cols-[220px_minmax(0,680px)] lg:gap-12">
        {/* Sticky table of contents (lg+) */}
        {toc.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">On this page</p>
              <ul className="mt-3 space-y-1.5">
                {toc.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="block text-[13px] leading-snug text-ink-soft hover:text-bonza">{h.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        <article className="min-w-0">
          <h1 className="font-display text-[32px] font-bold tracking-[-0.01em] text-ink">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
            {meta.effectiveFrom && <span>Effective {meta.effectiveFrom}</span>}
            {picked && <span className="rounded-full bg-[#EFEBE4] px-2 py-0.5 font-medium text-ink-soft tabular-nums">v{picked.version}</span>}
            {version && <span className="font-medium text-bonza">Historical version</span>}
            <Link to={`/legal/${doc}/changes`} className="font-semibold text-bonza hover:text-bonza-dark">Version history</Link>
          </div>

          <DocBanner />

          <div className="prose-bonza mt-7 text-[15px] leading-[1.7] text-ink-soft">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{cleanBody}</ReactMarkdown>
          </div>

          <div className="mt-12 border-t border-[#e6e1d8] pt-5 text-[13px] text-ink-muted">
            Questions? Email <a href="mailto:privacy@bonza.app" className="font-semibold text-bonza">privacy@bonza.app</a>.
          </div>
        </article>
      </div>
    </div>
  );
}

// /legal/:doc/changes — the version history for a document.
export function LegalChanges() {
  const { doc } = useParams();
  const entry = LEGAL_DOCS[doc];
  useHead({ title: `${entry?.title || "Legal"} — version history | Bonza`, canonical: canonicalUrl(`/legal/${doc}/changes`), robots: "noindex,follow" });

  if (!entry) return <Navigate to="/legal/privacy" replace />;

  const versions = entry.versions.map((v) => ({ ...v, meta: parseFrontmatter(v.raw).meta }));
  const currentId = versions[0]?.version;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <nav className="text-[13px] font-semibold text-ink-soft">
        <Link to={`/legal/${doc}`} className="hover:text-ink">{entry.title}</Link>
        <span className="px-2 text-ink-muted">/</span>
        <span className="text-ink">Version history</span>
      </nav>

      <h1 className="mt-4 font-display text-[30px] font-bold tracking-[-0.01em] text-ink">{entry.title} — versions</h1>
      <p className="mt-2 text-[14px] text-ink-soft">Every version of this document is kept so you can see exactly what applied when.</p>

      <ul className="mt-8 space-y-3">
        {versions.map((v) => (
          <li key={v.version} className="rounded-2xl border border-[#e6e1d8] bg-white px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold tabular-nums text-ink">v{v.version}</span>
                  {v.version === currentId && <span className="rounded-full bg-[#E7F2EB] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#1E7E40]">Current</span>}
                </div>
                {v.meta.effectiveFrom && <p className="mt-0.5 text-[13px] text-ink-muted">Effective {v.meta.effectiveFrom}</p>}
                {v.meta.summary && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{v.meta.summary}</p>}
              </div>
              <Link to={v.version === currentId ? `/legal/${doc}` : `/legal/${doc}/${v.version}`} className="shrink-0 rounded-lg border border-[#e3ded6] bg-white px-3 py-1.5 text-[13px] font-semibold text-ink hover:border-bonza hover:text-bonza">Read</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
