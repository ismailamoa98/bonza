// pages/HomePage.jsx — Public marketing homepage.
// A full-bleed cinematic hero (visitsaudi-style): placeholder background + dark
// gradient, overlay pill nav, centred copy, a floating horizontal search bar +
// glassy loyalty strip, and a story strip pinned to the bottom. Below the hero the
// continuous cream sections (packages carousel, stats, how-it-works, community, CTA)
// reveal/snap as before. The trip form is wired to the real optimize flow.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TripForm from "../components/TripForm";
import DestinationBand from "../components/hero/DestinationBand";
import WhyBonza from "../components/home/WhyBonza";
import DiscoverRails from "../components/home/DiscoverRails";
import HowItWorks from "../components/home/HowItWorks";
import SnapSection from "../components/SnapSection";
import { shuffle } from "../data/packages";
import { useTrip } from "../hooks/useTrip";
import { useAppStore } from "../store/appStore";
import { getLoyaltyPoints, apiErrorMessage, getHeroDestinations } from "../utils/api";
import { buildSearchUrl, reserveTab, redirectTab } from "../utils/searchUrl";
import RotatingBackdrop from "../components/common/RotatingBackdrop";
import { AUTH_DESTINATIONS } from "../data/authDestinations";

// The hero crossfades through the same self-hosted destination photos as the auth pages (public/auth/*),
// in a randomised order each visit. The bg-[#1f5f6b] base colour always shows while these load / if one fails.

const PROGRESS_STEPS = [
  "Comparing 200+ flight options…",
  "Checking award availability…",
  "Pricing hotels across Marriott, Hyatt, IHG…",
  "Finding the best car rates…",
  "Ranking your strategies…",
];

export default function HomePage() {
  const navigate = useNavigate();
  const { createAndOptimize, loading, error } = useTrip();

  const trip = useAppStore((s) => s.trip);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const setLoyaltyPoints = useAppStore((s) => s.setLoyaltyPoints);
  const setTrip = useAppStore((s) => s.setTrip);

  const [pointsError, setPointsError] = useState(null);
  const [progressIndex, setProgressIndex] = useState(0);

  const [heroIdx, setHeroIdx] = useState(0); // active slide — shared by the hero backdrop and the band
  const [order] = useState(() => shuffle(AUTH_DESTINATIONS)); // randomised slideshow order each visit
  const [heroData, setHeroData] = useState(null); // award-board data (public /destinations/hero)

  // Scope full-screen "slide" snapping to the homepage only.
  useEffect(() => {
    document.documentElement.classList.add("snap-page");
    return () => document.documentElement.classList.remove("snap-page");
  }, []);

  // Auto-fill loyalty points on first load (no manual entry).
  useEffect(() => {
    if (loyaltyPoints) return;
    getLoyaltyPoints()
      .then(setLoyaltyPoints)
      .catch((err) => setPointsError(apiErrorMessage(err)));
  }, [loyaltyPoints, setLoyaltyPoints]);

  // Hero award board — public endpoint; adds affordability markers when a session is present.
  useEffect(() => {
    getHeroDestinations()
      .then(setHeroData)
      .catch(() => {});
  }, []);

  // Auto-advance the shared slide — HomePage owns the index so the band's arrows/bars can drive the hero
  // photo too. 8s (longer than the auth page's 5s: the band carries reading material). Paused for reduced
  // motion and below 768px (a stacked band mid-rotation is disorienting).
  useEffect(() => {
    const n = order.length;
    if (n < 2) return undefined;
    const paused =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 767px)").matches;
    if (paused) return undefined;
    const t = setTimeout(() => setHeroIdx((i) => (i + 1) % n), 8000);
    return () => clearTimeout(t);
  }, [heroIdx, order.length]);

  // Rotate progress copy while optimizing.
  useEffect(() => {
    if (!loading) {
      setProgressIndex(0);
      return undefined;
    }
    const id = setInterval(
      () => setProgressIndex((i) => Math.min(i + 1, PROGRESS_STEPS.length - 1)),
      800
    );
    return () => clearInterval(id);
  }, [loading]);

  // Wire the form to the real flow: flexible -> month chooser, else optimize.
  const handleSubmit = async (form) => {
    const base = {
      origin: form.origin,
      originLabel: form.originLabel,
      destination: form.destination,
      destinationLabel: form.destinationLabel,
      budget: Number(form.budget),
      numberOfTravelers: Number(form.numberOfTravelers),
      flexibility: form.flexibility,
      preferences: { style: form.style },
    };
    if (form.flexibility) {
      setTrip({ ...base, checkIn: "", checkOut: "" });
      navigate("/flexible");
      return;
    }
    // Results open in a new tab. Reserve it now (in the click gesture) so it isn't popup-blocked, then
    // point it at the search once the trip is created; the homepage stays where it is.
    const tab = reserveTab();
    const ok = await createAndOptimize({ ...base, checkIn: form.checkIn, checkOut: form.checkOut });
    if (!ok) {
      tab?.close();
      return;
    }
    redirectTab(
      tab,
      buildSearchUrl({
        origin: form.origin,
        destination: form.destination,
        departureDate: form.checkIn,
        returnDate: form.checkOut,
        travelers: Number(form.numberOfTravelers) || 2,
        style: form.style,
      }),
      navigate
    );
  };

  // Derived hero state — shuffled image list + the award destination matching the current slide (by slug).
  const heroImages = order.map((d) => d.image);
  const bandDestination =
    heroData?.destinations?.find((d) => d.slug === order[heroIdx]?.slug) || null;

  const goTo = (i) => setHeroIdx(i);
  const step = (dir) => setHeroIdx((s) => (s + dir + order.length) % order.length);

  return (
    <div className="text-ink">
      {/* HERO + BAND share one viewport: the image flexes to fill the space above the band so the band's
          "See your best option" CTA lands at the bottom edge on load (no scroll needed to reach it). */}
      <div className="flex min-h-[100dvh] snap-start flex-col">
      {/* 1. CINEMATIC HERO — full-bleed image under the overlay nav. */}
      <section
        id="plan"
        className="relative flex flex-1 items-center overflow-hidden"
      >
        {/* Base colour (always visible) -> crossfading photos -> dark gradient for legibility. */}
        <div className="absolute inset-0 bg-[#1f5f6b]" />
        <RotatingBackdrop images={heroImages} activeIndex={heroIdx} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/70" />

        {/* On-image location caption — bottom-right, fades on each slide change. */}
        <div
          key={heroIdx}
          className="animate-fadein absolute bottom-6 right-6 z-10 flex items-center gap-1.5 text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span className="text-[13.5px] font-medium tracking-[-0.01em]">{order[heroIdx]?.name}</span>
        </div>

        {/* Centred content */}
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-20 pt-24 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/85 drop-shadow">
            Your AI Vacation Agent
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold leading-[1.05] tracking-[-0.01em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] sm:text-6xl">
            Where do you want to go?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-white/85 drop-shadow">
            Tell Bonza your trip. Our AI checks 50+ airlines &amp; hotels, reads your loyalty points
            via Plaid, and builds your best-value package — flights, hotel and car together.
          </p>

          {/* Floating search bar + glassy loyalty strip */}
          <div className="mx-auto mt-9 max-w-3xl text-left">
            <TripForm variant="bar" onSubmit={handleSubmit} loading={loading} initial={trip} />
            {pointsError && (
              <p className="mt-2 text-center text-[12px] text-amber-200">
                Couldn’t load your points: {pointsError}
              </p>
            )}
            {error && <p className="mt-2 text-center text-[12px] text-red-200">{error}</p>}
          </div>
        </div>

        {/* Value props pinned to the bottom edge (progress + destination name now live in the band below). */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-[13px]">
              <span className="font-bold text-white">Best-value packages</span>
              <span className="hidden text-white/60 sm:inline">Points + cash, optimised</span>
              <span className="hidden text-white/60 sm:inline">Book in one click</span>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 17 — award-price band. Full-width white section directly beneath the hero; shares the slide
          index so its arrows/bars also drive the hero photo. Does the proof the hero no longer carries. */}
      {bandDestination && (
        <DestinationBand
          destination={bandDestination}
          index={heroIdx}
          total={order.length}
          isAuthenticated={heroData?.isAuthenticated}
          onGoTo={goTo}
          onStep={step}
        />
      )}
      </div>

      {/* 2. WHY BONZA — statement + borderless capability row (Phase 18 §18d) */}
      <WhyBonza />

      {/* 3. DISCOVER — explore-by-country + origin-aware popular-trips rails (Phase 18 §18e) */}
      <DiscoverRails />

      {/* 4. HOW IT WORKS — corrected copy, three cards (Phase 18 §18j) */}
      <HowItWorks />

      {/* 5. COMMUNITY */}
      <SnapSection id="community">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bonza">
          Our community
        </p>
        <h2 className="mt-2 text-[2rem] font-medium tracking-[-0.02em] text-ink">
          Travelers love Bonza.
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">4.9/5 from 2,000+ reviews</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            [
              "SM",
              "Sarah M.",
              "London",
              "Saved £1,200 on my Paris trip. Found awards I’d never have discovered manually.",
            ],
            [
              "JK",
              "James K.",
              "New York",
              "Finally understands airline value. The travel hack I always needed.",
            ],
            ["LT", "Lisa T.", "Singapore", "My loyalty points finally matter. Complete game changer."],
          ].map(([initials, name, city, quote]) => (
            <div key={name}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bonza-100 text-[13px] font-semibold text-bonza">
                  {initials}
                </span>
                <div>
                  <p className="text-[14px] font-medium text-ink">{name}</p>
                  <p className="text-[12px] text-ink-muted">{city}</p>
                </div>
              </div>
              <p className="mt-4 text-[13px] italic leading-relaxed text-ink-soft">“{quote}”</p>
            </div>
          ))}
        </div>
      </SnapSection>

      {/* 6. FINAL CTA */}
      <SnapSection>
        <div className="rounded-3xl bg-bonza px-6 py-12 text-center">
          <h2 className="font-display text-[1.9rem] font-bold tracking-[-0.01em] text-white sm:text-[2.3rem]">
            Ready to plan your best trip yet?
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-relaxed text-white/85">
            Join 50,000+ travelers saving on every booking. Free forever — no credit card required.
          </p>
          <a
            href="#plan"
            className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-[13px] font-semibold text-bonza hover:bg-cream"
          >
            START PLANNING FREE
          </a>
        </div>
      </SnapSection>

      {/* 7. FOOTER */}
      <footer className="mt-10 border-t border-[#e6e1d8]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bonza text-[13px] font-semibold text-white">
              B
            </span>
            <span className="font-display text-[17px] font-semibold text-ink">Bonza</span>
          </div>
          <p className="text-[12px] text-ink-muted">
            Powered by Claude, Plaid &amp; 50+ partner APIs · Privacy · Terms · Cookies
          </p>
        </div>
      </footer>

      {/* Optimizing overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
          <div className="w-80 rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cream border-t-bonza" />
            <p className="font-semibold text-ink">Optimizing your trip</p>
            <p className="mt-1 h-5 text-[13px] text-ink-soft transition-all">
              {PROGRESS_STEPS[progressIndex]}
            </p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-cream">
              <div
                className="h-full rounded-full bg-bonza transition-all duration-700"
                style={{ width: `${((progressIndex + 1) / PROGRESS_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
