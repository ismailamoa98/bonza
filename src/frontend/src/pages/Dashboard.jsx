// pages/Dashboard.jsx — The logged-in home (route /dashboard, Clerk-guarded at App level).
// "Skyscanner pattern" utility layout on the continuous cream background (no SnapSection):
//   1. greeting   2. unified card (horizontal search bar + 3-column loyalty strip)
//   3. meta row (recent-trip resume pills + New trip + Plaid sync note)   4. package carousel.
// Keeps loyalty-drives-offers: the LoyaltyStrip shows real balances; each PackageCard shows
// its OWN redemption cost. FROM is intentionally not prefilled (no homeAirport in the Clerk user).
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TripForm from "../components/TripForm";
import PackageCarousel from "../components/PackageCarousel";
import LoyaltyStrip from "../components/LoyaltyStrip";
import { bestProgram } from "../components/LoyaltyCard";
import { PACKAGES, shuffle } from "../data/packages";
import { useTrip } from "../hooks/useTrip";
import { useOpenPackage } from "../hooks/useOpenPackage";
import { useAppStore } from "../store/appStore";
import { getLoyaltyPoints, getTrips, optimizeTrip, apiErrorMessage } from "../utils/api";
import { shortDate } from "../utils/format";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const { createAndOptimize, loading, error: optimizeError } = useTrip();
  const { openPackage, opening, openError } = useOpenPackage();

  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const setLoyaltyPoints = useAppStore((s) => s.setLoyaltyPoints);
  const setTrip = useAppStore((s) => s.setTrip);
  const setTripId = useAppStore((s) => s.setTripId);
  const setOptimization = useAppStore((s) => s.setOptimization);

  const [trips, setTrips] = useState([]);
  const [resumingId, setResumingId] = useState(null);
  const [error, setError] = useState(null);

  const cardRef = useRef(null);

  // Shuffled deck + a stable image seed for the carousel.
  const [deck] = useState(() => shuffle(PACKAGES));
  const [seed] = useState(() => Math.floor(Math.random() * 100000));

  // Load loyalty balances (Plaid mock) once.
  useEffect(() => {
    if (loyaltyPoints) return;
    getLoyaltyPoints()
      .then(setLoyaltyPoints)
      .catch((err) => setError(apiErrorMessage(err)));
  }, [loyaltyPoints, setLoyaltyPoints]);

  // Load recent searches.
  useEffect(() => {
    getTrips()
      .then(setTrips)
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  // Offers sorted so the user's best-value program floats to the front — WITHOUT
  // changing what any card shows (loyalty-drives-offers stays decoupled).
  const best = bestProgram(loyaltyPoints);
  const sortedDeck = useMemo(() => {
    if (!best) return deck;
    const matches = (p) => {
      const l = (p.loyalty || "").toLowerCase();
      return l.includes(best.short.toLowerCase()) || l.includes(best.label.toLowerCase()) ? 1 : 0;
    };
    return [...deck].sort((a, b) => matches(b) - matches(a));
  }, [deck, best]);

  // The route is gated by <RequireAuth> (Clerk) at the App level; this only waits
  // for AuthSync to mirror the Clerk user into the store before rendering.
  if (!user) return null;

  // Same flow as the homepage form: flexible -> month chooser, else optimize.
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

  // Re-run optimization for an existing trip and jump back into the flow.
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

  const firstName = user.name?.trim().split(/\s+/)[0] || "Traveller";
  const recent = trips.slice(0, 3);
  const anyError = error || optimizeError || openError;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 text-ink">
      {/* 1. GREETING */}
      <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-bonza">
        Welcome back, {firstName}
        <span className="inline-block h-px w-12 bg-bonza/35" />
      </p>
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
        <span className="flex items-center gap-[5px] text-[10px] text-ink-muted">
          <span className="h-[5px] w-[5px] rounded-full bg-[#34B368]" />
          Synced via Plaid · 2h ago
        </span>
      </div>

      {anyError && <p className="mt-3 text-[12px] text-red-600">{anyError}</p>}

      {/* 4. PACKAGE CAROUSEL */}
      <div className="mt-12">
        <PackageCarousel packages={sortedDeck} seed={seed} onOpen={openPackage} />
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
