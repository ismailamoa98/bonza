// pages/HelpCategory.jsx — Phase 22 §22c. A category's article list: title, blurb, then title + summary rows.
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getHelpCategory, apiErrorMessage } from "../utils/api";
import { useHead } from "../utils/useHead";
import { canonicalUrl } from "../utils/siteUrl";
import Icon from "../components/support/icons";

export default function HelpCategory() {
  const { category } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    getHelpCategory(category).then(setData).catch((e) => setError(apiErrorMessage(e)));
  }, [category]);

  useHead({
    title: data ? `${data.category.name} — Help | Bonza` : "Help | Bonza",
    description: data?.category.blurb || undefined,
    canonical: canonicalUrl(`/help/${category}`),
  });

  if (error) return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-[14px] text-ink-soft">We couldn&rsquo;t find that category. <Link to="/help" className="font-semibold text-bonza">Back to Help</Link></div>;
  if (!data) return <div className="mx-auto max-w-3xl px-6 py-16" aria-hidden="true"><div className="h-8 w-48 rounded bg-[#EFEBE4]" /><div className="mt-6 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-[#EFEBE4]" />)}</div></div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/help" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink"><Icon name="chevronRight" size={14} className="rotate-180" /> Help</Link>
      <h1 className="mt-4 font-display text-[28px] font-bold tracking-[-0.01em] text-ink">{data.category.name}</h1>
      <p className="mt-2 text-[14px] text-ink-soft">{data.category.blurb}</p>

      <ul className="mt-6 divide-y divide-[#f0ebe3] rounded-2xl border border-[#e6e1d8] bg-white">
        {data.articles.map((a) => (
          <li key={a.slug}>
            <Link to={`/help/${data.category.slug}/${a.slug}`} className="block px-5 py-4 hover:bg-cream">
              <p className="text-[15px] font-semibold text-ink">{a.title}</p>
              <p className="mt-0.5 text-[13px] text-ink-soft">{a.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
