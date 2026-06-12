// pages/HomePage.jsx — Public marketing homepage.
// A full-bleed cinematic hero (visitsaudi-style): placeholder background + dark
// gradient, overlay pill nav, centred copy, a floating horizontal search bar +
// glassy loyalty strip, and a story strip pinned to the bottom. Below the hero the
// continuous cream sections (packages carousel, stats, how-it-works, community, CTA)
// reveal/snap as before. The trip form is wired to the real optimize flow.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TripForm from "../components/TripForm";
import PackageCard from "../components/PackageCard";
import LoyaltyCard from "../components/LoyaltyCard";
import SnapSection from "../components/SnapSection";
import { PACKAGES, shuffle } from "../data/packages";
import { useTrip } from "../hooks/useTrip";
import { useAppStore } from "../store/appStore";
import {
  getLoyaltyPoints,
  getFlights,
  getHotels,
  getCars,
  createTrip,
  createBookingLink,
  apiErrorMessage,
} from "../utils/api";

// PLACEHOLDER — swap for a licensed hero photo, or a muted autoplay
// <video autoplay muted loop playsinline> (like the reference site). The bg-[#1f5f6b]
// base colour below always shows while this loads or if it fails, so the hero never
// looks broken.
const HERO_IMAGE = "https://loremflickr.com/1920/1080/maldives,resort,aerial?lock=5";

const PROGRESS_STEPS = [
  "Comparing 200+ flight options…",
  "Checking award availability…",
  "Pricing hotels across Marriott, Hyatt, IHG…",
  "Finding the best car rates…",
  "Ranking your strategies…",
];

// Loyalty program id -> affiliate vendor name (mirrors useOptimization.js).
const HOTEL_VENDOR = { marriott: "Marriott", ihg: "IHG", hilton: "Hilton" };

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Parse a package's "Jun 23 - Jul 1" into ISO check-in/out, rolled to the next
// upcoming occurrence (so a past month jumps to next year).
function parsePackageDates(dates) {
  const [a, b] = String(dates || "").split(" - ");
  const parsePart = (s) => {
    const [mon, day] = s.trim().split(/\s+/);
    return { m: MONTHS[mon?.toLowerCase()?.slice(0, 3)] ?? 0, d: parseInt(day, 10) || 1 };
  };
  const now = new Date();
  const ci = parsePart(a);
  let year = now.getUTCFullYear();
  let checkIn = new Date(Date.UTC(year, ci.m, ci.d));
  if (checkIn < now) {
    year += 1;
    checkIn = new Date(Date.UTC(year, ci.m, ci.d));
  }
  const co = parsePart(b || a);
  const outYear = co.m < ci.m ? year + 1 : year;
  const checkOut = new Date(Date.UTC(outYear, co.m, co.d));
  return { checkIn: checkIn.toISOString().slice(0, 10), checkOut: checkOut.toISOString().slice(0, 10) };
}

// "£1,240" -> 1240
const parseBudget = (cash) => Number(String(cash || "").replace(/[^0-9]/g, "")) || 0;

// Build the { flight, hotel, car } vendor objects the booking endpoint expects.
function selectionVendors(flight, hotel, car) {
  const vendors = {};
  if (flight) vendors.flight = { vendor: flight.airline, label: flight.cabin };
  if (hotel) {
    const programKey = Object.keys(hotel.loyaltyPrograms || {})[0];
    vendors.hotel = { vendor: HOTEL_VENDOR[programKey] || "Marriott", label: hotel.name };
  }
  if (car) vendors.car = { vendor: car.vendor, label: car.carClass };
  return vendors;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { createAndOptimize, loading, error } = useTrip();

  const trip = useAppStore((s) => s.trip);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const setLoyaltyPoints = useAppStore((s) => s.setLoyaltyPoints);
  const setTrip = useAppStore((s) => s.setTrip);
  const setTripId = useAppStore((s) => s.setTripId);
  const setSelections = useAppStore((s) => s.setSelections);
  const setBooking = useAppStore((s) => s.setBooking);

  const [pointsError, setPointsError] = useState(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(null);

  // Shuffled deck for the carousel; reshuffles (with a fresh image seed) on demand.
  const [deck, setDeck] = useState(() => shuffle(PACKAGES));
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000));
  const reshuffle = () => {
    setDeck(shuffle(PACKAGES));
    setSeed(Math.floor(Math.random() * 100000));
  };

  // Horizontal carousel scrolling.
  const trackRef = useRef(null);
  const scrollByCard = (dir = 1) => {
    const el = trackRef.current;
    if (!el) return;
    const step = (el.firstElementChild?.offsetWidth || 288) + 20;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    el.scrollTo({ left: dir > 0 && atEnd ? 0 : el.scrollLeft + dir * step, behavior: "smooth" });
  };

  // Optional 10s auto-advance of the carousel — disabled under reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setInterval(() => scrollByCard(1), 10000);
    return () => clearInterval(id);
  }, [deck]);

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
    const ok = await createAndOptimize({ ...base, checkIn: form.checkIn, checkOut: form.checkOut });
    if (ok) navigate("/optimize");
  };

  // Open a marketing package -> build a trip, auto-pick a flight/hotel/car,
  // create the booking link, and jump to the Step 3 booking page.
  const openPackage = async (pkg) => {
    if (opening) return;
    setOpening(true);
    setOpenError(null);
    try {
      const { checkIn, checkOut } = parsePackageDates(pkg.dates);
      const destLabel = pkg.city;
      const tripData = {
        origin: "LHR",
        originLabel: "LHR — London",
        destination: destLabel,
        destinationLabel: destLabel,
        checkIn,
        checkOut,
        budget: parseBudget(pkg.cash),
        numberOfTravelers: 2,
        flexibility: false,
        preferences: { style: "Points Max" },
      };
      const { id } = await createTrip(tripData);
      setTrip(tripData);
      setTripId(id);

      const [flights, hotels, cars] = await Promise.all([
        getFlights({ from: "LHR", to: destLabel, checkIn }),
        getHotels({ destination: destLabel, checkIn }),
        getCars({ location: destLabel, checkIn }),
      ]);
      const flight = flights[0] || null;
      const hotel = hotels[0] || null;
      const car = cars[0] || null;
      setSelections({ flight, hotel, car });

      const vendors = selectionVendors(flight, hotel, car);
      const data = await createBookingLink(id, null, vendors);
      setBooking(data);
      navigate("/booking");
    } catch (err) {
      setOpenError(apiErrorMessage(err));
      setOpening(false);
    }
  };

  return (
    <div className="text-ink">
      {/* 1. CINEMATIC HERO — full-bleed image under the overlay nav. */}
      <section
        id="plan"
        className="relative flex min-h-[90dvh] snap-start items-center overflow-hidden"
      >
        {/* Base colour (always visible) -> photo -> dark gradient for legibility. */}
        <div className="absolute inset-0 bg-[#1f5f6b]" />
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/70" />

        {/* Centred content */}
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-28 pt-28 text-center">
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
            <div className="mx-auto mt-4 max-w-lg">
              <LoyaltyCard loyaltyPoints={loyaltyPoints} variant="full" />
            </div>
            {pointsError && (
              <p className="mt-2 text-center text-[12px] text-amber-200">
                Couldn’t load your points: {pointsError}
              </p>
            )}
            {(error || openError) && (
              <p className="mt-2 text-center text-[12px] text-red-200">{error || openError}</p>
            )}
          </div>
        </div>

        {/* Cinematic story strip pinned to the bottom */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-6">
          <div className="mx-auto max-w-7xl">
            <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-bonza to-bonza-light" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex flex-wrap gap-x-8 gap-y-1 text-[13px]">
                <span className="font-bold text-white">Best-value packages</span>
                <span className="hidden text-white/60 sm:inline">Points + cash, optimised</span>
                <span className="hidden text-white/60 sm:inline">Book in one click</span>
              </div>
              <span className="h-9 w-9 overflow-hidden rounded-full bg-white/20 ring-2 ring-white/70">
                <img
                  src="https://loremflickr.com/80/80/portrait,traveler?lock=7"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PACKAGES CAROUSEL */}
      <SnapSection id="packages">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bonza">
              🎯 Personalized for you
            </p>
            <h2 className="mt-2 text-[2rem] font-medium tracking-[-0.02em] text-ink">
              Explore your packages
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reshuffle}
              className="rounded-full border border-[#e3ded6] bg-white px-3.5 py-2 text-[12px] font-semibold text-ink-soft hover:border-bonza hover:text-bonza"
            >
              🔀 Shuffle
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              aria-label="Next packages"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-bonza text-white hover:bg-bonza-dark"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {deck.map((pkg) => (
            <div key={pkg.city} className="w-72 shrink-0 snap-start">
              <PackageCard package={pkg} seed={seed} onOpen={openPackage} />
            </div>
          ))}
        </div>
      </SnapSection>

      {/* 3. STATS */}
      <SnapSection>
        <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
          {[
            ["2 min", "to build a package"],
            ["50+", "airline & hotel APIs"],
            ["$25M", "saved by travelers"],
            ["50K+", "active users"],
          ].map(([num, label]) => (
            <div key={label}>
              <p className="text-[2rem] font-medium tabular-nums tracking-[-0.01em] text-bonza">{num}</p>
              <p className="mt-1 text-[12px] text-ink-muted">{label}</p>
            </div>
          ))}
        </div>
      </SnapSection>

      {/* 4. HOW IT WORKS */}
      <SnapSection id="walkthrough">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bonza">
          How it works
        </p>
        <h2 className="mt-2 text-[2rem] font-medium tracking-[-0.02em] text-ink">
          Your best trip in three steps.
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            [
              "Connect via Plaid",
              "Securely link your loyalty accounts. Bonza reads your balances automatically — no manual entry, ever.",
            ],
            [
              "Enter your trip",
              "Where, when, who. Bonza’s AI scans 50+ airlines and 200+ hotels, mixing points and cash for the best value.",
            ],
            [
              "Get your packages",
              "Complete flight + hotel + car bundles with a clear recommendation and deal rating. Book in one click.",
            ],
          ].map(([title, body], i) => (
            <div key={title}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bonza text-[15px] font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-[16px] font-medium text-ink">{title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </SnapSection>

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

      {/* Optimizing / booking overlay */}
      {(loading || opening) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40">
          <div className="w-80 rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cream border-t-bonza" />
            <p className="font-semibold text-ink">
              {opening ? "Preparing your booking" : "Optimizing your trip"}
            </p>
            {!opening && (
              <>
                <p className="mt-1 h-5 text-[13px] text-ink-soft transition-all">
                  {PROGRESS_STEPS[progressIndex]}
                </p>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-cream">
                  <div
                    className="h-full rounded-full bg-bonza transition-all duration-700"
                    style={{ width: `${((progressIndex + 1) / PROGRESS_STEPS.length) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
