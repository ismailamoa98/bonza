// pages/NotFound.jsx — custom 404 for unknown routes. Replaces the old silent redirect to "/" (a soft-404):
// gives the visitor a clear message and useful next steps, and tells crawlers not to index the URL.
import { Link } from "react-router-dom";
import { useHead } from "../utils/useHead";

export default function NotFound() {
  useHead({ title: "Page not found | Bonza", description: "The page you were looking for doesn’t exist or has moved.", robots: "noindex" });

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="font-display text-[64px] font-bold leading-none text-bonza">404</p>
      <h1 className="mt-4 font-display text-[26px] font-bold tracking-[-0.01em] text-ink">This page doesn’t exist</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
        The link may be broken or the page may have moved. Let’s get you back on track.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="rounded-xl bg-bonza px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-bonza-dark">
          Back to home
        </Link>
        <Link to="/explore" className="rounded-xl border border-[#e0dacf] bg-white px-5 py-2.5 text-[14px] font-semibold text-ink hover:bg-cream">
          Explore destinations
        </Link>
        <Link to="/help" className="rounded-xl border border-[#e0dacf] bg-white px-5 py-2.5 text-[14px] font-semibold text-ink hover:bg-cream">
          Visit the help centre
        </Link>
      </div>
    </div>
  );
}
