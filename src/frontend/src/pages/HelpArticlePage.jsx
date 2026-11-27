// pages/HelpArticlePage.jsx — Phase 22 §22c. Article body (markdown, 680px measure), helpful Yes/No where a
// "No" reveals the contact link immediately, related articles, and a "Contact support" footer.
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getHelpArticle, voteHelpful, apiErrorMessage } from "../utils/api";
import { useHead } from "../utils/useHead";
import { canonicalUrl } from "../utils/siteUrl";
import Icon from "../components/support/icons";

export default function HelpArticlePage() {
  const { category, slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [vote, setVote] = useState(null); // 'yes' | 'no' | null

  useEffect(() => {
    setData(null);
    setError(null);
    setVote(null);
    getHelpArticle(slug).then(setData).catch((e) => setError(apiErrorMessage(e)));
  }, [slug]);

  const canonical = canonicalUrl(`/help/${category}/${slug}`);
  useHead(data ? { title: `${data.article.title} | Bonza Help`, description: data.article.summary, canonical } : { title: "Help | Bonza" });

  const castVote = (helpful) => {
    setVote(helpful ? "yes" : "no");
    voteHelpful(slug, helpful).catch(() => {});
  };

  if (error) return <div className="mx-auto max-w-[680px] px-6 py-16 text-center text-[14px] text-ink-soft">We couldn&rsquo;t find that article. <Link to="/help" className="font-semibold text-bonza">Back to Help</Link></div>;
  if (!data) return <div className="mx-auto max-w-[680px] px-6 py-16" aria-hidden="true"><div className="h-9 w-2/3 rounded bg-[#EFEBE4]" /><div className="mt-6 space-y-3">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-4 rounded bg-[#EFEBE4]" />)}</div></div>;

  const { article, categoryName, related } = data;

  return (
    <div className="mx-auto max-w-[680px] px-6 py-12">
      <nav className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
        <Link to="/help" className="hover:text-ink">Help</Link>
        <Icon name="chevronRight" size={13} className="text-ink-muted" />
        <Link to={`/help/${article.category}`} className="hover:text-ink">{categoryName}</Link>
      </nav>

      <h1 className="mt-4 font-display text-[30px] font-bold leading-tight tracking-[-0.01em] text-ink">{article.title}</h1>

      <div className="prose-bonza mt-6 text-[15px] leading-[1.75] text-ink-soft">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
      </div>

      {/* Helpful */}
      <div className="mt-10 rounded-2xl border border-[#e6e1d8] bg-cream px-5 py-4">
        {vote === null ? (
          <div className="flex items-center gap-4">
            <span className="text-[14px] font-semibold text-ink">Was this helpful?</span>
            <button type="button" onClick={() => castVote(true)} className="rounded-lg border border-[#e3ded6] bg-white px-3 py-1.5 text-[13px] font-semibold text-ink hover:border-bonza hover:text-bonza">Yes</button>
            <button type="button" onClick={() => castVote(false)} className="rounded-lg border border-[#e3ded6] bg-white px-3 py-1.5 text-[13px] font-semibold text-ink hover:border-bonza hover:text-bonza">No</button>
          </div>
        ) : vote === "yes" ? (
          <p className="text-[14px] text-ink-soft">Thanks for the feedback.</p>
        ) : (
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[14px] text-ink-soft">Sorry this didn&rsquo;t help. A person can.</p>
            <Link to="/help/contact" className="rounded-lg bg-[#141210] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#332B25]">Contact support</Link>
          </div>
        )}
      </div>

      {related.length > 0 && (
        <div className="mt-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">Related</p>
          <ul className="mt-2 space-y-1.5">
            {related.map((r) => (
              <li key={r.slug}>
                <Link to={`/help/${r.category}/${r.slug}`} className="text-[14px] font-semibold text-bonza hover:text-bonza-dark">{r.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between border-t border-[#e6e1d8] pt-5 text-[13px]">
        <span className="text-ink-muted">Still stuck?</span>
        <Link to="/help/contact" className="inline-flex items-center gap-1 font-semibold text-bonza hover:text-bonza-dark">Contact support <Icon name="chevronRight" size={14} /></Link>
      </div>
    </div>
  );
}
