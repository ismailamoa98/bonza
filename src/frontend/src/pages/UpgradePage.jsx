// pages/UpgradePage.jsx — Bonza Pro marketing + Stripe checkout entry.
import { useState } from "react";
import { Link } from "react-router-dom";
import { startProCheckout, apiErrorMessage } from "../utils/api";

const FEATURES = [
  {
    title: "Intelligence",
    items: [
      "Full points-vs-cash optimisation on every leg",
      "Transfer-partner paths with live ¢/pt valuations",
      "Award availability across 25+ programmes",
    ],
  },
  {
    title: "Bookings",
    items: [
      "Real cash + points pricing side by side",
      "Direct loyalty deep-links, dates pre-filled",
      "One booking history across flights, hotels & cars",
    ],
  },
  {
    title: "Tracking",
    items: [
      "3% Bonza Credits back on cash bookings",
      "Credits redeemable against trips or renewals",
      "Balance and earnings tracked automatically",
    ],
  },
];

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const { checkoutUrl } = await startProCheckout();
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return; // navigating away
      }
      setError("Couldn't start checkout. Please try again.");
      setLoading(false);
    } catch (err) {
      setError(apiErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 font-jakarta text-ink">
      <div className="text-center">
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-bonza">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />
          </svg>
          Bonza Pro
        </p>
        <h1 className="mt-2 font-display text-[2.8rem] font-semibold leading-[1.05] tracking-[-1.2px]">
          Unlock <em className="not-italic text-bonza">Bonza Pro</em>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          The full loyalty engine — every redemption path, award availability and cashback.
        </p>
        <p className="mt-5 text-[15px] text-ink">
          <span className="font-display text-[2rem] font-bold tabular-nums">£49.99</span>
          <span className="text-ink-soft">/year</span>
          <span className="ml-2 text-[13px] text-ink-muted tabular-nums">· just £4.17/month</span>
        </p>

        <button
          type="button"
          onClick={start}
          disabled={loading}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-bonza px-8 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-bonza-dark disabled:opacity-50"
        >
          {loading ? "Starting checkout…" : "Start with Pro"}
          {!loading && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>
        {error && <p className="mt-3 text-[12px] text-red-600">{error}</p>}
        <p className="mt-3 text-[12px] text-ink-muted">
          Already subscribed?{" "}
          <Link to="/dashboard" className="font-semibold text-bonza hover:text-bonza-dark">
            Go to your dashboard
          </Link>
        </p>
      </div>

      {/* Feature columns */}
      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {FEATURES.map((col) => (
          <div key={col.title} className="rounded-2xl border border-[rgba(40,30,20,0.08)] bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-bonza">{col.title}</p>
            <ul className="mt-3 space-y-2.5">
              {col.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-soft">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-bonza" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bonza Credits explainer */}
      <div className="mt-8 rounded-2xl border border-bonza/20 bg-cream p-6 text-center">
        <p className="font-display text-xl font-semibold text-ink">Earn while you book</p>
        <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-ink-soft">
          Get <b className="text-ink">3% back</b> in Bonza Credits on every cash booking — your first
          booking is free, even before you upgrade. Credits stack and apply to future trips or your Pro
          renewal.
        </p>
      </div>
    </div>
  );
}
