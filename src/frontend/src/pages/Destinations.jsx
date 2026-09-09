// pages/Destinations.jsx — "Destinations for you": a login-gated page of personalised package
// recommendations (real recs from /recommendations, mock deck as fallback), sorted to the user's
// strongest loyalty balance. Reuses the same PackageCarousel + hooks as the dashboard so browse
// behaviour stays identical; opening a card routes into the search/optimize flow.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PackageCarousel from "../components/PackageCarousel";
import { bestProgram } from "../components/LoyaltyCard";
import { PACKAGES, shuffle } from "../data/packages";
import { useOpenPackage } from "../hooks/useOpenPackage";
import { useRecommendations } from "../hooks/useRecommendations";
import { recToPackage } from "../utils/recToPackage";
import { useAppStore } from "../store/appStore";
import { getLoyaltyPoints, getLoyaltyAccounts, apiErrorMessage } from "../utils/api";

export default function Destinations() {
  const user = useAppStore((s) => s.user);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const setLoyaltyPoints = useAppStore((s) => s.setLoyaltyPoints);
  const loyaltyAccounts = useAppStore((s) => s.loyaltyAccounts);
  const setLoyaltyAccounts = useAppStore((s) => s.setLoyaltyAccounts);

  const { openPackage, opening, openError } = useOpenPackage();
  const { data: recs, status: recStatus } = useRecommendations();

  const [mockDeck] = useState(() => shuffle(PACKAGES));
  const [seed] = useState(() => Math.floor(Math.random() * 100000));
  const [error, setError] = useState(null);

  const personalising = recStatus === "loading" || recStatus === "generating";
  const recPackages = useMemo(() => recs.map(recToPackage), [recs]);
  const deck = recStatus === "ready" && recPackages.length ? recPackages : mockDeck;

  useEffect(() => {
    if (loyaltyPoints) return;
    getLoyaltyPoints()
      .then(setLoyaltyPoints)
      .catch((err) => setError(apiErrorMessage(err)));
  }, [loyaltyPoints, setLoyaltyPoints]);

  useEffect(() => {
    getLoyaltyAccounts()
      .then(setLoyaltyAccounts)
      .catch(() => {});
  }, [setLoyaltyAccounts]);

  // Float packages that match the user's strongest balance to the front (personalisation).
  const best = bestProgram(loyaltyPoints);
  const sortedDeck = useMemo(() => {
    if (!best) return deck;
    const matches = (p) => {
      const l = (p.loyalty || "").toLowerCase();
      return l.includes(best.short.toLowerCase()) || l.includes(best.label.toLowerCase()) ? 1 : 0;
    };
    return [...deck].sort((a, b) => matches(b) - matches(a));
  }, [deck, best]);

  if (!user) return null;

  const firstName = user.firstName || (user.email ? user.email.split("@")[0] : "there");
  const anyError = error || openError;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 text-ink">
      {/* Hero */}
      <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-bonza">
        Destinations for you, {firstName}
        <span className="inline-block h-px w-12 bg-bonza/35" />
      </p>
      <h1 className="font-display text-[2.4rem] font-semibold tracking-[-0.02em] text-ink">
        Trips worth your points
      </h1>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-soft">
        Hand-picked stays and routes matched to the loyalty balances you actually hold — so every
        recommendation is one you could book with points today.
      </p>

      {anyError && <p className="mt-3 text-[12px] text-red-600">{anyError}</p>}

      {/* Connect-loyalty CTA — personalisation needs synced balances */}
      {loyaltyAccounts.length === 0 && (
        <div className="mt-8 flex items-center justify-between gap-3 rounded-xl border border-bonza/20 bg-white px-4 py-3">
          <p className="text-[13px] text-ink-soft">
            <b className="text-ink">Connect your loyalty accounts</b> — sync your points and Bonza will
            tailor these destinations to your balances.
          </p>
          <Link
            to="/settings"
            className="shrink-0 rounded-full bg-bonza px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-bonza-dark"
          >
            Connect loyalty
          </Link>
        </div>
      )}

      {/* Personalised deck — real recs (mock deck fallback) */}
      <div className="mt-12">
        {personalising ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bonza">
              Personalising your destinations…
            </p>
            <h2 className="mt-2 text-[2rem] font-medium tracking-[-0.02em] text-ink">
              Explore your packages
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[360px] animate-pulse rounded-2xl bg-white/70 shadow-[0_10px_35px_rgba(120,80,50,0.08)]" />
              ))}
            </div>
          </>
        ) : (
          <PackageCarousel
            packages={sortedDeck}
            seed={seed}
            onOpen={openPackage}
            eyebrow="Personalized for you"
            title="Explore your packages"
          />
        )}
      </div>

      {/* Opening overlay */}
      {opening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
          <div className="w-80 rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cream border-t-bonza" />
            <p className="font-semibold text-ink">Preparing your trip</p>
          </div>
        </div>
      )}
    </div>
  );
}
