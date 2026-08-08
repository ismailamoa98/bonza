// pages/Dashboard.jsx — logged-in home: greeting, TripForm bar, LoyaltyStrip, personalised carousel.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import TripForm from "../components/TripForm";
import PackageCarousel from "../components/PackageCarousel";
import LoyaltyStrip from "../components/LoyaltyStrip";
import { bestProgram } from "../components/LoyaltyCard";
import { PACKAGES, shuffle } from "../data/packages";
import { useTrip } from "../hooks/useTrip";
import { useOpenPackage } from "../hooks/useOpenPackage";
import { useRecommendations } from "../hooks/useRecommendations";
import { recToPackage } from "../utils/recToPackage";
import { useAppStore } from "../store/appStore";
import {
  getLoyaltyPoints,
  getTrips,
  optimizeTrip,
  syncLoyalty,
  getLoyaltyAccounts,
  apiErrorMessage,
} from "../utils/api";
import { shortDate, formatGbp } from "../utils/format";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAppStore((s) => s.user);
  const isPro = useAppStore((s) => s.isPro);
  const creditBalance = useAppStore((s) => s.creditBalance);
  const { createAndOptimize, loading, error: optimizeError } = useTrip();
  const { openPackage, opening, openError } = useOpenPackage();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const justUpgraded = searchParams.get("upgraded") === "true";

  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const setLoyaltyPoints = useAppStore((s) => s.setLoyaltyPoints);
  const setTrip = useAppStore((s) => s.setTrip);
  const setTripId = useAppStore((s) => s.setTripId);
  const setOptimization = useAppStore((s) => s.setOptimization);

  const [trips, setTrips] = useState([]);
  const [resumingId, setResumingId] = useState(null);
  const [error, setError] = useState(null);

  const cardRef = useRef(null);

  const { data: recs, status: recStatus, reload: reloadRecs } = useRecommendations();
  const loyaltyAccounts = useAppStore((s) => s.loyaltyAccounts);
  const setLoyaltyAccounts = useAppStore((s) => s.setLoyaltyAccounts);
  const [connecting, setConnecting] = useState(false);
  const [mockDeck] = useState(() => shuffle(PACKAGES));
  const [seed] = useState(() => Math.floor(Math.random() * 100000));
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
    getTrips()
      .then(setTrips)
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

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
    const ok = await createAndOptimize({ ...base, checkIn: form.checkIn, checkOut: form.checkOut });
    if (ok) navigate("/optimize");
  };

  const resumeTrip = async (t) => {
    if (resumingId) return;
    setResumingId(t.id);
    setError(null);
    try {
      setTrip({
        origin: t.origin,
        originLabel: t.origin,
        destination: t.destination,
        destinationLabel: t.destination,
        checkIn: String(t.checkIn).slice(0, 10),
        checkOut: String(t.checkOut).slice(0, 10),
        numberOfTravelers: t.numberOfTravelers,
        flexibility: false,
        preferences: {},
      });
      setTripId(t.id);
      const optimization = await optimizeTrip(t.id);
      setOptimization(optimization);
      navigate("/optimize");
    } catch (err) {
      setError(apiErrorMessage(err));
      setResumingId(null);
    }
  };

  const focusSearch = () => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    cardRef.current?.querySelector("input")?.focus();
  };

  const connectLoyalty = async () => {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    try {
      await syncLoyalty();
      setLoyaltyAccounts(await getLoyaltyAccounts());
      reloadRecs();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  };

  const firstName = user.name?.trim().split(/\s+/)[0] || "Traveller";
  const recent = trips.slice(0, 3);
  const anyError = error || optimizeError || openError;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 text-ink">
      {/* 1. GREETING */}
      <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-bonza">
        Welcome back, {firstName}
        {isPro && (
          <span className="inline-flex items-center gap-1 rounded-full bg-bonza px-2 py-0.5 text-[9px] font-bold tracking-[0.08em] text-white">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />
            </svg>
            PRO
          </span>
        )}
        <span className="inline-block h-px w-12 bg-bonza/35" />
      </p>

      {/* Post-checkout confirmation */}
      {justUpgraded && isPro && (
        <div className="mb-4 rounded-xl border border-[#bfe3cb] bg-[#EAF6EE] px-4 py-3 text-[13px] font-medium text-[#1E7E40]">
          Welcome to Bonza Pro — full points optimisation and cashback are unlocked.
        </div>
      )}
      <h1 className="mb-6 font-display text-[2.6rem] font-semibold leading-[1.0] tracking-[-1.2px] text-ink">
        Where are you flying <em className="not-italic text-bonza">next?</em>
      </h1>

      {/* 2. MAIN CARD — search + loyalty */}
      <div ref={cardRef} className="overflow-hidden rounded-2xl border border-[rgba(40,30,20,0.06)] bg-white">
        <div className="border-b border-[rgba(40,30,20,0.04)] p-4 sm:p-5">
          <TripForm
            variant="bar"
            embedded
            loyaltyPoints={loyaltyPoints}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>
        <LoyaltyStrip loyaltyPoints={loyaltyPoints} email={user.email} />
      </div>

      {/* Upgrade banner — free users only, dismissible */}
      {!isPro && !bannerDismissed && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-bonza/20 bg-cream px-4 py-3">
          <p className="text-[13px] text-ink-soft">
            <b className="text-ink">Unlock Bonza Pro</b> — full points optimisation, award availability
            and 3% cashback for <span className="tabular-nums">£49.99/year</span>.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/upgrade"
              className="rounded-full bg-bonza px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-bonza-dark"
            >
              Upgrade
            </Link>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 3. META ROW */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-ink-muted">Recent</span>
          {recent.length === 0 && (
            <span className="text-[11px] text-ink-muted">No recent trips yet</span>
          )}
          {recent.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => resumeTrip(t)}
              disabled={Boolean(resumingId)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-[rgba(40,30,20,0.08)] bg-white px-3 py-[5px] text-[11px] font-medium text-ink transition-all hover:border-bonza/30 hover:shadow-[0_2px_8px_rgba(40,30,20,0.06)] disabled:opacity-60"
            >
              <PlaneIcon />
              {t.origin} → {t.destination} · {shortDate(t.checkIn)}
              <span className="ml-1 text-[10px] font-bold text-bonza">
                {resumingId === t.id ? "Resuming…" : "Resume →"}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={focusSearch}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[rgba(40,30,20,0.15)] bg-transparent px-3 py-[5px] text-[11px] font-medium text-ink-soft transition-colors hover:border-bonza/40 hover:text-bonza"
          >
            <PlusIcon />
            New trip
          </button>
        </div>
        <div className="flex items-center gap-3">
          {creditBalance > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-[11px] font-semibold text-ink tabular-nums">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-bonza" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10M9.5 9.5h3.5a1.75 1.75 0 0 1 0 3.5H10a1.75 1.75 0 0 0 0 3.5h3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {formatGbp(creditBalance)} credits
            </span>
          )}
          <span className="flex items-center gap-[5px] text-[10px] text-ink-muted">
            <span className="h-[5px] w-[5px] rounded-full bg-[#34B368]" />
            Synced via Plaid · 2h ago
          </span>
        </div>
      </div>

      {anyError && <p className="mt-3 text-[12px] text-red-600">{anyError}</p>}

      {/* Connect-loyalty CTA — personalisation needs synced balances (loyalty stays explicit) */}
      {loyaltyAccounts.length === 0 && (
        <div className="mt-10 flex items-center justify-between gap-3 rounded-xl border border-bonza/20 bg-white px-4 py-3">
          <p className="text-[13px] text-ink-soft">
            <b className="text-ink">Connect your loyalty accounts</b> — sync your points and Bonza will
            personalise these packages to your balances.
          </p>
          <button
            type="button"
            onClick={connectLoyalty}
            disabled={connecting}
            className="shrink-0 rounded-full bg-bonza px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-bonza-dark disabled:opacity-60"
          >
            {connecting ? "Connecting…" : "Connect loyalty"}
          </button>
        </div>
      )}

      {/* 4. PACKAGE CAROUSEL — real personalised recs (8n), mock deck as fallback */}
      <div className="mt-12">
        {personalising ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bonza">
              Personalising your packages…
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
          <PackageCarousel packages={sortedDeck} seed={seed} onOpen={openPackage} />
        )}
      </div>

      {/* Optimizing / booking overlay */}
      {(loading || opening || resumingId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
          <div className="w-80 rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cream border-t-bonza" />
            <p className="font-semibold text-ink">
              {opening ? "Preparing your booking" : "Optimizing your trip"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-muted">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 4.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
