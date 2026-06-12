// pages/HomePage.jsx — Public marketing homepage.
// Premium-SaaS landing on Pampas cream: hero with the functional trip form + a
// shuffling "Personalized for you" deck, stats, how-it-works, more packages,
// community, and a final CTA. The trip form is wired to the real optimize flow.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TripForm from "../components/TripForm";
import PackageCard from "../components/PackageCard";
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
  // If the return month is earlier than departure, it lands in the next year.
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

  // Shuffled once on mount for variety. The hero is a slideshow that auto-advances
  // through the deck; the grid shows a static slice.
  const [deck] = useState(() => shuffle(PACKAGES));
  const [seed] = useState(() => Math.floor(Math.random() * 100000));
  const [heroIndex, setHeroIndex] = useState(0);
  const heroCard = deck[heroIndex];
  const gridDeck = deck.slice(1, 7);

  // Auto-advance the personalized offer every 10s.
  useEffect(() => {
    const id = setInterval(() => setHeroIndex((i) => (i + 1) % deck.length), 10000);
    return () => clearInterval(id);
  }, [deck.length]);

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
      {/* 1. HERO — one-screen: fills the viewport so "See how it works" lands in view. */}
      <section
        id="plan"
        className="mx-auto flex max-w-7xl snap-start scroll-mt-16 flex-col px-6 pt-6 pb-6 lg:min-h-[calc(100dvh-64px)]"
      >
        <h1 className="text-[2.4rem] font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-[2.7rem]">
          Where do you want to go?
        </h1>

        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch lg:flex-1 lg:min-h-0">
          {/* Left: copy + form */}
          <div>
            <p className="max-w-[520px] text-[14px] leading-relaxed text-ink-soft">
              Tell Bonza your trip. Our AI checks 50+ airlines &amp; hotels, reads your loyalty
              points via Plaid, and builds your best-value package — flights, hotel, and car
              together.
            </p>
            <button
              type="button"
              onClick={() =>
                document.getElementById("walkthrough")?.scrollIntoView({ behavior: "smooth" })
              }
              className="mt-2 text-[13px] font-medium text-bonza hover:text-bonza-dark"
            >
              See how it works ↓
            </button>
            <div className="mt-4">
              <TripForm
                loyaltyPoints={loyaltyPoints}
                onSubmit={handleSubmit}
                loading={loading}
                initial={trip}
              />
              {pointsError && (
                <p className="mt-2 text-[12px] text-amber-600">
                  Couldn’t load your points: {pointsError}
                </p>
              )}
              {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
            </div>
          </div>

          {/* Right: one personalized pick (shuffle for more) */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bonza">
                Personalized for you
              </p>
              {/* Slideshow position — click a dot to jump. */}
              <div className="flex items-center gap-1.5">
                {deck.map((p, i) => (
                  <button
                    key={p.city}
                    type="button"
                    onClick={() => setHeroIndex(i)}
                    aria-label={`Show offer ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === heroIndex ? "w-4 bg-bonza" : "w-1.5 bg-bonza/25 hover:bg-bonza/50"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 lg:flex-1 lg:min-h-0">
              {heroCard && (
                <div key={heroCard.city} className="animate-fadein lg:h-full">
                  <PackageCard package={heroCard} seed={seed} fill onOpen={openPackage} />
                </div>
              )}
            </div>
            {openError && <p className="mt-2 text-[12px] text-red-600">{openError}</p>}
          </div>
        </div>
      </section>

      {/* 2. STATS */}
      <SnapSection>
        <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
          {[
            ["2 min", "to build a package"],
            ["50+", "airline & hotel APIs"],
            ["$25M", "saved by travelers"],
            ["50K+", "active users"],
          ].map(([num, label]) => (
            <div key={label}>
              <p className="text-[2rem] font-medium tracking-[-0.01em] text-bonza">{num}</p>
              <p className="mt-1 text-[12px] text-ink-muted">{label}</p>
            </div>
          ))}
        </div>
      </SnapSection>

      {/* 3. HOW IT WORKS */}
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

      {/* 4. MORE PACKAGES */}
      <SnapSection>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bonza">
          More packages for you
        </p>
        <h2 className="mt-2 text-[2rem] font-medium tracking-[-0.02em] text-ink">
          Bundles tuned to your points.
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gridDeck.map((pkg) => (
            <PackageCard key={pkg.city} package={pkg} seed={seed} onOpen={openPackage} />
          ))}
        </div>
      </SnapSection>

      {/* 5. COMMUNITY */}
      <SnapSection>
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
          <h2 className="text-[1.8rem] font-medium tracking-[-0.02em] text-white sm:text-[2.1rem]">
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
            <span className="text-[15px] font-medium text-ink">Bonza</span>
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
