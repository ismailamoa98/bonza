// components/Navigation.jsx — top nav: wordmark, links, NotificationBell, auth controls.
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import NotificationBell from "./NotificationBell";

// Primary nav — internal routes (react-router). "Destinations for you" and "Trips" are auth-gated
// (RequireAuth), so a signed-out click routes through /login and returns the user afterwards.
const LINKS = [
  { label: "Home", to: "/" },
  { label: "Destinations for you", to: "/destinations" },
  { label: "Points", to: "/points" },
  { label: "Trips", to: "/bookings" },
];

export default function Navigation({ overlay: overlayProp }) {
  const { pathname } = useLocation();
  const onHome = pathname === "/";
  const onLogin = pathname === "/login";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!onHome) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onHome]);

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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        {/* Left: wordmark + links */}
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bonza text-[20px] font-semibold text-white">
              B
            </span>
            <span className={`font-display text-[27px] font-semibold tracking-[-0.01em] ${wordmark}`}>
              Bonza
            </span>
          </Link>
          <nav className="hidden items-center gap-9 lg:flex">
            {LINKS.map((l) => {
              const active = pathname === l.to;
              const activeClass = overlay ? "text-white" : "text-bonza";
              return (
                <Link
                  key={l.label}
                  to={l.to}
                  className={`text-[16px] font-medium transition-colors ${active ? activeClass : linkClass}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: glassy utility pills + solid Get started */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`hidden items-center gap-2 rounded-full border px-4 py-2.5 text-[14px] font-medium transition-colors sm:flex ${pillClass}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search
          </button>
          <button
            type="button"
            className={`hidden items-center gap-2 rounded-full border px-4 py-2.5 text-[14px] font-medium transition-colors sm:flex ${pillClass}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
            </svg>
            EN
          </button>
          <SignedIn>
            <NotificationBell overlay={overlay} />
            <UserButton
              afterSignOutUrl="/"
              userProfileUrl="/settings"
              appearance={{ elements: { avatarBox: "w-11 h-11 ring-2 ring-white/70" } }}
            />
          </SignedIn>
          <SignedOut>
            <Link
              to="/login"
              className={`hidden rounded-full border px-4 py-2.5 text-[14px] font-medium transition-colors sm:block ${pillClass}`}
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-bonza px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-bonza-dark"
            >
              Get started
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
