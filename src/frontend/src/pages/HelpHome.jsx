// pages/HelpHome.jsx — Phase 22 §22l. Topic grid with the selected topic's Q&A rendered inline beneath it (one
// page, no second navigation). Search still deep-links to /help/:topic/:slug. ?topic= makes a topic linkable.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getHelpTopics, searchHelp, voteHelpful } from "../utils/api";
import { useHead } from "../utils/useHead";
import { canonicalUrl } from "../utils/siteUrl";
import Icon from "../components/support/icons";

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function QuestionRow({ article, open, onToggle, topic }) {
  const [vote, setVote] = useState(null);
  const cast = (helpful) => {
    setVote(helpful ? "yes" : "no");
    voteHelpful(article.slug, helpful).catch(() => {});
  };
  return (
    <div className="border-b border-[#f0ebe3] last:border-0">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="text-[14.5px] font-semibold text-ink">{article.title}</span>
        <span className={`flex-shrink-0 transition-transform ${open ? "rotate-45 text-[#B5603F]" : "text-[#B8AFA3]"}`}><Icon name="plus" size={18} sw={2} /></span>
      </button>
      {open && (
        <div className="px-5 pb-5">
          <div className="prose-bonza max-w-[620px] text-[14px] leading-[1.65] text-[#4A423B]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {vote === "no" ? (
              <span className="text-[13px] text-ink-soft">A person can help — <Link to="/help/contact" className="font-semibold text-[#B5603F]">Contact support →</Link></span>
            ) : vote === "yes" ? (
              <span className="text-[13px] text-ink-muted">Thanks for the feedback.</span>
            ) : (
              <span className="flex items-center gap-3 text-[13px]">
                <span className="text-ink-soft">Was this helpful?</span>
                <button type="button" onClick={() => cast(true)} className="rounded-md border border-[#e3ded6] bg-white px-2.5 py-1 font-semibold text-ink hover:border-bonza hover:text-bonza">Yes</button>
                <button type="button" onClick={() => cast(false)} className="rounded-md border border-[#e3ded6] bg-white px-2.5 py-1 font-semibold text-ink hover:border-bonza hover:text-bonza">No</button>
              </span>
            )}
            <Link to={`/help/${topic}/${article.slug}`} className="text-[12.5px] font-semibold text-[#B5603F] hover:underline">Open article →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HelpHome() {
  useHead({
    title: "Help Centre | Bonza",
    description: "Answers about bookings, points, payments and your account — search the Bonza help centre or contact support.",
    canonical: canonicalUrl("/help"),
  });
  const [params, setParams] = useSearchParams();
  const [topics, setTopics] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [openSlug, setOpenSlug] = useState(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const debounced = useDebounced(query, 250);

  const selectedSlug = params.get("topic");

  useEffect(() => {
    getHelpTopics().then(setTopics).catch(() => {});
    if (window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus();
  }, []);

  const selected = useMemo(() => topics.find((t) => t.slug === selectedSlug) || topics[0] || null, [topics, selectedSlug]);

  // Open the first question whenever the selected topic changes.
  useEffect(() => {
    if (selected?.articles?.length) setOpenSlug(selected.articles[0].slug);
  }, [selected?.slug]);

  useEffect(() => {
    if (debounced.trim().length < 2) return setResults([]);
    searchHelp(debounced).then(setResults).catch(() => setResults([]));
  }, [debounced]);

  const pickTopic = (slug) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("topic", slug);
      return next;
    });
    setTimeout(() => panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 0);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink"><Icon name="chevronRight" size={14} className="rotate-180" /> Home</Link>
      <h1 className="mt-4 font-display text-[30px] font-bold tracking-[-0.03em] text-ink">Help centre</h1>
      <p className="mt-1 text-[15px] text-[#7A7269]">Pick a topic, or search if you already know what you&rsquo;re after.</p>

      {/* Search */}
      <div className="relative mt-5 max-w-[520px]">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"><Icon name="search" size={18} /></span>
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Search help — try "cancel a points booking"' className="w-full rounded-xl border border-[#e3ded6] bg-white py-3 pl-11 pr-4 text-[15px] text-ink focus:border-bonza focus:outline-none" />
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#e0d9cf] bg-white shadow-[0_16px_38px_rgba(40,30,20,0.16)]">
            {results.map((r) => (
              <li key={r.slug}><Link to={`/help/${r.category}/${r.slug}`} className="block px-4 py-2.5 hover:bg-cream"><p className="text-[14px] font-semibold text-ink">{r.title}</p><p className="text-[12.5px] text-ink-muted">{r.summary}</p></Link></li>
            ))}
          </ul>
        )}
      </div>

      {/* Topic grid */}
      <div className="mt-7 grid grid-cols-1 gap-[0.85rem] sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => {
          const isSel = selected?.slug === t.slug;
          return (
            <button key={t.slug} type="button" onClick={() => pickTopic(t.slug)} className={`rounded-[14px] border p-5 text-left transition-all ${isSel ? "border-bonza bg-[#FDF8F5]" : "border-[#EAE4DB] bg-white hover:-translate-y-0.5 hover:border-[#D6CEC4] hover:shadow-[0_6px_18px_rgba(20,18,16,0.06)]"}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isSel ? "bg-[#FBE3DA] text-[#B5603F]" : "bg-[#F4F1EC] text-[#6B635B]"}`}><Icon name={t.icon} size={19} /></span>
              <p className="mt-3 text-[15px] font-bold tracking-[-0.25px] text-ink">{t.name}</p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-[#8A8078]">{t.blurb}</p>
              <p className={`mt-2 flex items-center gap-1 text-[11.5px] font-semibold ${isSel ? "text-[#B5603F]" : "text-[#B8AFA3]"}`}>{t.articles.length} answers <Icon name="chevronRight" size={12} /></p>
            </button>
          );
        })}
      </div>

      {/* Selected topic panel */}
      {selected && (
        <div ref={panelRef} className="mt-6 overflow-hidden rounded-2xl border border-[#EAE4DB] bg-white">
          <div className="flex items-center gap-3 border-b border-[#f0ebe3] bg-[#FDFCFA] px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F1EC] text-[#6B635B]"><Icon name={selected.icon} size={19} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-ink">{selected.name}</p>
              <p className="text-[12.5px] text-[#8A8078]">{selected.blurb}</p>
            </div>
            <span className="flex-shrink-0 text-[12px] font-semibold text-[#B8AFA3] tabular-nums">{selected.articles.length} articles</span>
          </div>
          {selected.articles.map((a) => (
            <QuestionRow key={a.slug} article={a} topic={selected.slug} open={openSlug === a.slug} onToggle={() => setOpenSlug(openSlug === a.slug ? null : a.slug)} />
          ))}
        </div>
      )}

      {/* Can't find it */}
      <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-[#EAE4DB] bg-cream px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F1EC] text-[#6B635B]"><Icon name="spark" size={19} /></span>
          <div><p className="text-[14.5px] font-bold text-ink">Can&rsquo;t find it?</p><p className="text-[12.5px] text-ink-soft">Ask Bonza, or talk to a person.</p></div>
        </div>
        <Link to="/help/contact" className="flex-shrink-0 rounded-lg bg-[#141210] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#332B25]">Contact support</Link>
      </div>
    </div>
  );
}
