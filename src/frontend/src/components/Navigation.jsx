// components/Navigation.jsx — App header / landing navbar.
// Two looks: an OVERLAY pill nav (transparent, white text, glassy pills) that floats
// over the cinematic hero on the homepage, and the default SOLID cream bar everywhere
// else. On the homepage it auto-swaps to solid once the user scrolls past the hero.
// The serif wordmark uses font-display (Playfair); links/pills stay Plus Jakarta Sans.
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

const LINKS = [
  { label: "Destinations", href: "/#packages", caret: true },
  { label: "How it works", href: "/#walkthrough" },
  { label: "Rewards", href: "/#community" },
  { label: "Pricing", href: "/#pricing" },
];

export default function Navigation({ overlay: overlayProp }) {
  const { pathname } = useLocation();
  const onHome = pathname === "/";
  const onLogin = pathname === "/login";
  const [scrolled, setScrolled] = useState(false);

  // Only the homepage hero gets the overlay treatment, and only until scrolled past.
  useEffect(() => {
    if (!onHome) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onHome]);

  // The login page is a full-bleed split screen with its own back link — no app chrome.
  if (onLogin) return null;

  const overlay = (overlayProp ?? onHome) && !scrolled;

  const headerClass = overlay
    ? "fixed inset-x-0 top-0 z-30 bg-[#3a8a9c]/35 backdrop-blur-md"
    : onHome
      ? "fixed inset-x-0 top-0 z-30 bg-cream/95 shadow-[0_1px_0_rgba(40,30,20,0.06)] backdrop-blur"
      : "sticky top-0 z-20 bg-cream/95 backdrop-blur";

  const wordmark = overlay ? "text-white" : "text-ink";
  const linkClass = overlay
    ? "text-white/85 hover:text-white"
    : "text-ink-soft hover:text-ink";
  const pillClass = overlay
    ? "border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20"
    : "border-[#e3ded6] bg-white text-ink hover:border-bonza hover:text-bonza";

  return (
    <header className={headerClass}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Left: wordmark + links */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-bonza text-[15px] font-semibold text-white">
              B
            </span>
            <span className={`font-display text-[20px] font-semibold tracking-[-0.01em] ${wordmark}`}>
              Bonza
            </span>
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className={`text-[13px] font-medium ${linkClass}`}
              >
                {l.label}
                {l.caret && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="ml-1 inline-block" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
              </a>
            ))}
          </nav>
        </div>

        {/* Right: glassy utility pills + solid Get started */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className={`hidden items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors sm:flex ${pillClass}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search
          </button>
          <button
            type="button"
            className={`hidden items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors sm:flex ${pillClass}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
            </svg>
            EN
          </button>
          <SignedIn>
            <Link
              to="/dashboard"
              className={`hidden rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors sm:block ${
                pathname === "/dashboard"
                  ? overlay
                    ? "border-white/60 bg-white/25 text-white"
                    : "border-bonza bg-bonza-50 text-bonza"
                  : pillClass
              }`}
            >
              Dashboard
            </Link>
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: "w-9 h-9 ring-2 ring-white/70" } }}
            />
          </SignedIn>
          <SignedOut>
            <Link
              to="/login"
              className={`hidden rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors sm:block ${pillClass}`}
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-bonza px-4 py-2 text-[12px] font-semibold text-white hover:bg-bonza-dark"
            >
              Get started
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
