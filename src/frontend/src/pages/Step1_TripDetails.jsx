// pages/Step1_TripDetails.jsx — Landing page + functional trip form.
// Product-led marketing page (hero, how-it-works, loyalty optimization, offers,
// trust, testimonials, social proof) wrapped around the working trip form. The
// form keeps all real behavior: AirportDropdown, dates (greyed when flexible),
// budget, travelers, Plaid loyalty auto-fill, and submit -> /optimize or
// /flexible. Travel Style pills are captured as a preference (default Points Max).
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AirportDropdown from "../components/AirportDropdown";
import { useTrip } from "../hooks/useTrip";
import { useAppStore } from "../store/appStore";
import { getLoyaltyPoints, apiErrorMessage } from "../utils/api";
import { formatPoints } from "../utils/format";

const POINT_LABELS = [
  { key: "amex", label: "AMEX Points" },
  { key: "chaseUr", label: "Chase UR" },
  { key: "unitedMiles", label: "United Miles" },
  { key: "marriottPoints", label: "Marriott Points" },
];

const TRAVEL_STYLES = ["Business", "Luxury", "Points Max", "Budget", "Family"];

const PROGRESS_STEPS = [
  "Comparing 200+ flight options…",
  "Checking award availability…",
  "Pricing hotels across Marriott, Hyatt, IHG…",
  "Finding the best car rates…",
  "Ranking your strategies…",
];

const today = new Date().toISOString().slice(0, 10);

export default function Step1_TripDetails() {
  const navigate = useNavigate();
  const { createAndOptimize, loading, error } = useTrip();

  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const setLoyaltyPoints = useAppStore((s) => s.setLoyaltyPoints);
  const setTrip = useAppStore((s) => s.setTrip);
  const trip = useAppStore((s) => s.trip);

  const [form, setForm] = useState({
    origin: trip?.origin || "",
    originLabel: trip?.originLabel || "",
    destination: trip?.destination || "",
    destinationLabel: trip?.destinationLabel || "",
    checkIn: trip?.checkIn || "",
    checkOut: trip?.checkOut || "",
    budget: trip?.budget || "",
    numberOfTravelers: trip?.numberOfTravelers || 1,
    flexibility: trip?.flexibility || false,
    style: trip?.preferences?.style || "Points Max",
  });
  const [pointsError, setPointsError] = useState(null);
  const [progressIndex, setProgressIndex] = useState(0);

  // Auto-fill loyalty points on first load (no manual entry).
  useEffect(() => {
    if (loyaltyPoints) return;
    getLoyaltyPoints()
      .then(setLoyaltyPoints)
      .catch((err) => setPointsError(apiErrorMessage(err)));
  }, [loyaltyPoints, setLoyaltyPoints]);

  // Rotate the progress messages while optimizing.
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

  const update = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Flexible trips don't need fixed dates — Bonza shops them across months.
  const valid = useMemo(() => {
    const core = form.origin && form.destination && Number(form.budget) > 0;
    return form.flexibility ? core : core && form.checkIn && form.checkOut;
  }, [form]);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
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
    // Flexible: defer trip creation (no dates yet) and pick a month first.
    if (form.flexibility) {
      setTrip({ ...base, checkIn: "", checkOut: "" });
      navigate("/flexible");
      return;
    }
    const ok = await createAndOptimize({ ...base, checkIn: form.checkIn, checkOut: form.checkOut });
    if (ok) navigate("/optimize");
  };

  return (
    <div className="bg-white">
      <Hero />

      {/* Trip form — the working centerpiece */}
      <section className="mx-auto max-w-3xl px-4">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Plan your trip</p>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AirportDropdown
              label="From"
              placeholder="From (London)"
              displayLabel={form.originLabel}
              onSelect={(a) =>
                setForm((f) => ({ ...f, origin: a.code, originLabel: `${a.code} — ${a.city}` }))
              }
            />
            <AirportDropdown
              label="To"
              placeholder="To (Paris)"
              displayLabel={form.destinationLabel}
              onSelect={(a) =>
                setForm((f) => ({
                  ...f,
                  destination: a.code,
                  destinationLabel: `${a.code} — ${a.city}`,
                }))
              }
            />
            <Field label="Depart">
              <input
                required={!form.flexibility}
                disabled={form.flexibility}
                type="date"
                min={today}
                value={form.checkIn}
                onChange={update("checkIn")}
                className={form.flexibility ? disabledInputClass : inputClass}
              />
            </Field>
            <Field label="Return">
              <input
                required={!form.flexibility}
                disabled={form.flexibility}
                type="date"
                min={form.checkIn || today}
                value={form.checkOut}
                onChange={update("checkOut")}
                className={form.flexibility ? disabledInputClass : inputClass}
              />
            </Field>
            <Field label="Budget (USD)">
              <input
                required
                type="number"
                min="0"
                value={form.budget}
                onChange={update("budget")}
                placeholder="5000"
                className={inputClass}
              />
            </Field>
            <Field label="Travelers">
              <input
                type="number"
                min="1"
                value={form.numberOfTravelers}
                onChange={update("numberOfTravelers")}
                className={inputClass}
              />
            </Field>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.flexibility}
              onChange={update("flexibility")}
              className="h-4 w-4 rounded border-slate-300 accent-bonza"
            />
            My dates are flexible
            {form.flexibility && (
              <span className="text-xs text-slate-400">— Bonza will find the best month for you</span>
            )}
          </label>

          {/* Travel style pills */}
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Travel style</p>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {TRAVEL_STYLES.map((style) => {
                const active = form.style === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, style }))}
                    className={[
                      "rounded-full border-2 px-4 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "border-bonza bg-bonza text-white"
                        : "border-slate-200 bg-white text-bonza hover:border-bonza",
                    ].join(" ")}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-filled loyalty points */}
          <div className="mt-6">
            <p className="text-sm font-medium text-slate-600">
              Your loyalty points{" "}
              <span className="text-slate-400">(auto-filled via Plaid — no entry needed)</span>
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {POINT_LABELS.map(({ key, label }) => (
                <div key={key} className="rounded-lg bg-bonza-50 p-3 text-center">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-lg font-bold text-bonza">
                    {loyaltyPoints ? formatPoints(loyaltyPoints[key]) : "—"}
                  </p>
                </div>
              ))}
            </div>
            {pointsError && (
              <p className="mt-2 text-sm text-amber-600">Couldn’t load your points: {pointsError}</p>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !valid}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-bonza px-4 py-3 font-medium text-white shadow-[0_4px_12px_rgba(31,79,82,0.15)] hover:bg-bonza-dark disabled:opacity-50"
          >
            <span className="text-lg">🔍</span>
            {loading ? "Optimizing…" : form.flexibility ? "Find my best month" : "Search trips"}
          </button>
        </form>
      </section>

      <HowBonzaWorks />
      <ItineraryExample />
      <OffersCarousel />
      <TrustBadges />
      <WhyBonza />
      <Testimonials />
      <SocialProof />
      <Footer />

      {/* Optimizing overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-80 rounded-xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-bonza" />
            <p className="font-semibold text-slate-800">Optimizing your trip</p>
            <p className="mt-1 h-5 text-sm text-slate-500 transition-all">{PROGRESS_STEPS[progressIndex]}</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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

// --- Form helpers -----------------------------------------------------------

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2.5 text-[13px] focus:border-bonza focus:outline-none";

const disabledInputClass =
  "w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 px-3 py-2.5 text-[13px] text-slate-400";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

// --- Marketing sections (presentational) ------------------------------------

function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-4 pb-8 pt-12 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-bonza-light">
        ✨ Your AI Vacation Agent
      </p>
      <h1 className="mt-3 text-[2.5rem] font-medium leading-[1.15] text-bonza">
        The modern way to plan <span className="italic text-bonza-light">travel</span>
      </h1>
      <p className="mx-auto mt-4 max-w-[550px] text-[15px] leading-relaxed text-slate-500">
        Connected to Plaid. Powered by 50+ airline &amp; hotel APIs. Real-time data, personalized
        recommendations.
      </p>
    </section>
  );
}

function HowBonzaWorks() {
  const boxes = [
    ["Peak vs Off-Peak Value", "Know exactly when to use points"],
    ["Partner Airlines", "Transfer at optimal rates"],
    ["Elite Status Benefits", "Maximize perks by airline"],
  ];
  return (
    <section className="mx-auto mt-12 max-w-5xl px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-bonza">How Bonza Works</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Connect your loyalty accounts via Plaid. Bonza analyzes all 50+ airlines and 200+
              hotels to find your best options.
              <br />
              <br />
              Get personalized recommendations with full itineraries, pricing comparisons, and
              real-time points value.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-bonza">We Handle Everything</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Just tell Bonza where you want to go and when. Our AI advisor optimizes across:
            </p>
            <ul className="mt-2 space-y-1 text-[13px] text-slate-600">
              <li>• Points vs cash redemptions</li>
              <li>• Transfer partnerships &amp; bonuses</li>
              <li>• Award availability &amp; pricing</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-medium text-bonza">Optimize Your Loyalty Programs</h3>
          <p className="mt-2 text-[13px] text-slate-600">
            Most travelers leave 30-50% of their points value on the table. Bonza finds the sweet
            spots:
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {boxes.map(([title, sub]) => (
              <div key={title} className="rounded-lg bg-bonza-50 p-4">
                <p className="text-[13px] font-medium text-bonza">{title}</p>
                <p className="mt-1 text-xs text-slate-500">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const LEGS = [
  {
    badge: "⭐ Best",
    from: ["09:15", "LHR"],
    mid: ["British Airways", "1h 15m"],
    to: ["11:30", "CDG"],
    price: "£89 / 15k Avios",
    hotel: "Hôtel Le Marais",
    activity: "Louvre Museum",
  },
  {
    badge: "✈️ Direct",
    from: ["13:40", "CDG"],
    mid: ["Air France", "1h 20m"],
    to: ["15:00", "AMS"],
    price: "£74 / 12k Flying Blue",
    hotel: "Canal House",
    activity: "Rijksmuseum",
  },
  {
    badge: "💰 Cheap",
    from: ["18:10", "AMS"],
    mid: ["easyJet", "1h 05m"],
    to: ["18:15", "LHR"],
    price: "£45",
    hotel: "Home sweet home",
    activity: "Trip complete",
    summary: "£2,450",
  },
];

function ItineraryExample() {
  return (
    <section className="mx-auto mt-12 max-w-5xl px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-medium text-bonza">London Long Weekend</h3>
          <p className="text-xs text-slate-500">May 18-21 • 3 Cities • 2 People</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {LEGS.map((leg, i) => (
            <div key={i} className="space-y-3">
              {/* Flight card with badge */}
              <div className="relative rounded-lg border-2 border-bonza bg-bonza-50 p-4">
                <span className="absolute -top-2 right-3 rounded-2xl bg-bonza px-2.5 py-0.5 text-[11px] font-medium text-white">
                  {leg.badge}
                </span>
                <div className="flex items-center justify-between text-center text-xs text-slate-700">
                  <div>
                    <p className="font-semibold">{leg.from[0]}</p>
                    <p className="text-slate-500">{leg.from[1]}</p>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <p>{leg.mid[0]}</p>
                    <p>{leg.mid[1]}</p>
                  </div>
                  <div>
                    <p className="font-semibold">{leg.to[0]}</p>
                    <p className="text-slate-500">{leg.to[1]}</p>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] font-medium text-bonza-light">{leg.price}</p>
              </div>

              {/* Hotel + activity */}
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
                <span className="font-medium text-slate-700">🏨 {leg.hotel}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
                <span className="font-medium text-slate-700">📍 {leg.activity}</span>
              </div>

              {/* Summary card on the last leg */}
              {leg.summary && (
                <div className="rounded-lg border-2 border-bonza-light bg-gradient-to-br from-bonza-light/10 to-bonza/10 p-4 text-center">
                  <p className="text-[10px] text-slate-500">Trip Value</p>
                  <p className="text-base font-medium text-bonza">{leg.summary}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const OFFERS = [
  {
    gradient: "from-[#FFD699] to-[#EE964B]",
    date: "📅 Jun 23 - Jul 13",
    title: "7 days • Portugal",
    route: "Lisbon • Porto • Lisbon",
    price: "£82",
    was: "£136",
    perk: "✓ Golden price for your tier",
    tags: ["Direct flights", "TAP Portugal"],
  },
  {
    gradient: "from-[#FFB347] to-[#FF8C00]",
    date: "📅 Jun 23 - Jul 13",
    demand: "In high demand",
    title: "4 days • Spain",
    route: "Barcelona • Madrid • Barcelona",
    price: "£56",
    was: "£120",
    perk: "✓ Perfect timing for your points",
    tags: ["4-star hotels", "City centre"],
  },
  {
    gradient: "from-[#87CEEB] to-[#4A90E2]",
    date: "📅 Jun 23 - Jul 13",
    title: "5 days • France",
    route: "Nice • Paris • Nice",
    price: "£117",
    was: "£240",
    perk: "✓ Luxury property benefits",
    tags: ["5-star hotels", "Beach access"],
  },
];

function OffersCarousel() {
  return (
    <section className="mx-auto mt-14 max-w-5xl px-4">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-bonza-light">
        🎯 Personalized for you
      </p>
      <h2 className="mt-2 text-[1.8rem] font-medium text-bonza">
        Current offers tailored to your style
      </h2>
      <p className="mt-1 text-[13px] text-slate-500">
        💡 Real-time updates from 50+ airline &amp; hotel APIs. Personalized based on your
        preferences &amp; loyalty tier.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {OFFERS.map((o) => (
          <div
            key={o.title}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
          >
            <div className={`relative flex h-40 items-end bg-gradient-to-br ${o.gradient} p-4`}>
              <span className="absolute left-3 top-3 rounded bg-white px-3 py-1 text-[11px] font-medium text-slate-700">
                {o.date}
              </span>
              {o.demand && (
                <span className="absolute right-3 top-3 rounded bg-[#E53935] px-2.5 py-1 text-[11px] font-medium text-white">
                  {o.demand}
                </span>
              )}
              <p className="text-base font-medium text-white">{o.title}</p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">{o.route}</p>
              <div className="mt-3">
                <p className="text-[10px] text-slate-400">Transportation</p>
                <p className="text-xl font-medium text-bonza">
                  {o.price}{" "}
                  <span className="text-xs font-normal text-slate-400 line-through">{o.was}</span>
                </p>
              </div>
              <p className="mt-3 rounded bg-[#E8F5E9] px-3 py-2 text-[11px] font-medium text-[#2E7D32]">
                {o.perk}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {o.tags.map((t) => (
                  <span key={t} className="rounded bg-[#F5F5F5] px-2 py-1 text-[10px] text-[#666]">
                    {t}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-md bg-bonza py-2.5 text-[13px] font-medium text-white hover:bg-bonza-dark"
              >
                View deal
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustBadges() {
  const items = [
    ["🔒 Plaid + Bank Encryption", "Secure OAuth. Never store passwords."],
    ["⚡ 50+ Real-Time APIs", "Live updates from airlines & hotels"],
    ["✓ Always Free", "Affiliate commissions, no fees"],
  ];
  return (
    <section id="security" className="mx-auto mt-14 max-w-5xl px-4">
      <div className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 text-center sm:grid-cols-3 sm:p-8">
        {items.map(([title, sub]) => (
          <div key={title}>
            <p className="text-[13px] font-medium text-bonza">{title}</p>
            <p className="mt-1 text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyBonza() {
  const cards = [
    ["🤖 AI-Powered Analysis", "Claude understands airline value and mileage sweet spots."],
    ["🌍 All Vendors, One Place", "50+ airlines, 200+ hotels. United, Qatar, Marriott, Hilton."],
    ["🔒 Privacy First", "Plaid integration. Bank-level encryption. Never store passwords."],
    ["💰 Completely Free", "Affiliate commissions only. No subscriptions, no fees."],
  ];
  return (
    <section className="mx-auto mt-14 max-w-5xl px-4">
      <h2 className="text-[1.8rem] font-medium text-bonza">Why Bonza wins</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {cards.map(([title, body]) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-[15px] font-medium text-bonza">{title}</h3>
            <p className="mt-2 text-[13px] text-slate-500">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    ["Saved £1,200 on my Paris trip. Found awards I'd never discover manually.", "Sarah M., London"],
    ["Finally understands airline value. The travel hack I needed.", "James K., New York"],
    ["My loyalty points finally matter. Game changer.", "Lisa T., Singapore"],
  ];
  return (
    <section className="mx-auto mt-14 max-w-5xl px-4">
      <h2 className="text-[1.8rem] font-medium text-bonza">Loved by travelers</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {quotes.map(([quote, author]) => (
          <div key={author} className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-[13px] leading-relaxed text-bonza">“{quote}”</p>
            <p className="mt-3 text-xs font-medium text-slate-500">{author}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SocialProof() {
  const metrics = [
    ["12K+", "Trips Optimized"],
    ["$25M", "Saved"],
    ["4.9★", "From 2K+ Reviews"],
    ["50K+", "Active Users"],
  ];
  return (
    <section className="mx-auto mt-14 max-w-5xl px-4">
      <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
        {metrics.map(([num, label]) => (
          <div key={label}>
            <p className="text-[2rem] font-medium text-bonza">{num}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white py-6">
      <p className="px-4 text-center text-xs text-slate-500">
        © 2024 Bonza Travel. All rights reserved. Powered by Claude, Plaid, and 50+ partner APIs.
      </p>
    </footer>
  );
}
