// pages/Login.jsx — Sign-in / create-account page (route /login).
// Split-screen cinematic layout: a full-bleed image panel (Bonza wordmark + welcome
// headline + back link) on the left, and the sign-in card on the right (cream panel).
// Clerk owns the form (email/password + Google/Microsoft social, enabled in the Clerk
// dashboard) — we restyle Clerk's <SignIn> via the appearance prop so it blends into
// our panel. Hash routing keeps every sub-step (factor-one, SSO callback, …) under
// the single /login route. The global app nav is hidden on this route (Navigation.jsx).
import { Link } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";

// PLACEHOLDER — swap for a licensed photo. The bg-[#1f5f6b] base always shows while
// this loads or if it fails, so the panel never looks broken (same pattern as the hero).
const LOGIN_IMAGE = "https://loremflickr.com/1600/2000/morocco,desert,travel?lock=11";

// Theme Clerk's <SignIn> to Bonza and strip its own card chrome so it sits flush in
// the cream panel.
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#da7756",
    colorBackground: "#ffffff",
    colorText: "#2a2420",
    colorTextSecondary: "#6a6258",
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border-none",
    card: "w-full shadow-none border-none bg-transparent p-0",
    headerTitle: "font-display",
    formButtonPrimary:
      "bg-bonza hover:bg-bonza-dark text-white font-semibold normal-case",
    footerActionLink: "text-bonza hover:text-bonza-dark",
  },
};

export default function Login() {
  return (
    <div className="grid min-h-[100dvh] font-jakarta lg:grid-cols-[1.05fr_minmax(420px,0.85fr)]">
      {/* LEFT — cinematic brand panel */}
      <div className="relative hidden overflow-hidden lg:block">
        {/* Base colour (always visible) -> photo -> dark gradient for legibility. */}
        <div className="absolute inset-0 bg-[#1f5f6b]" />
        <img src={LOGIN_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/45 via-black/20 to-black/70" />

        {/* Back link — replaces the (hidden) top nav home link. */}
        <Link
          to="/"
          className="absolute left-8 top-8 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Bonza
        </Link>

        {/* Brand block — wordmark + welcome headline pinned bottom-left. */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-12 text-white">
          <Link to="/" className="mb-6 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-bonza text-[16px] font-semibold text-white">
              B
            </span>
            <span className="font-display text-[22px] font-semibold tracking-[-0.01em] text-white drop-shadow">
              Bonza
            </span>
          </Link>
          <h1 className="font-display text-[2.75rem] font-bold leading-[1.05] tracking-[-0.01em] drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)]">
            Welcome back
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/85 drop-shadow">
            Your AI travel agent, ready when you are — sign in to pick up your trips, points and
            best-value packages.
          </p>
        </div>
      </div>

      {/* RIGHT — sign-in card */}
      <div className="flex items-center justify-center bg-cream px-6 py-12">
        <div className="w-full max-w-md">
          <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-bonza">
            Sign in
            <span className="inline-block h-px w-10 bg-bonza/35" />
          </p>
          <h2 className="mb-6 font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.01em] text-ink">
            Sign in to Bonza
          </h2>
          <SignIn routing="hash" appearance={CLERK_APPEARANCE} />
        </div>
      </div>
    </div>
  );
}
