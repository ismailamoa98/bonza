// components/LoyaltyStrip.jsx — full-width loyalty rows for the dashboard search card.
// One row per held program, stacked and split by hairlines. Reuses loyaltyRows()
// (single rate table in LoyaltyCard) so points/£ stay in sync with the full card.
// Keeps loyalty-drives-offers: reads ONLY loyaltyPoints (+ the signed-in email for
// display) — never PackageCard data.
import { loyaltyRows } from "./LoyaltyCard";
import { formatPoints } from "../utils/format";

// Fixed per-program marker colours (by program, NOT by rank — unlike the full
// card's value-ranked shades). Matches the redesign spec.
const MARKER = {
  amex: "#B0552F",
  chaseUr: "#da7756",
  unitedMiles: "#E6B79A",
  marriottPoints: "#EBC9B5",
};

// Per-program status tier badge (display chrome — kept alongside MARKER, not in the
// balance payload). Neutral fallback covers any program without a brand tier.
const TIER = {
  amex: { label: "Platinum", bg: "#FBF2EE", color: "#B0552F" },
  chaseUr: { label: "Sapphire", bg: "#FBE8E0", color: "#da7756" },
  unitedMiles: { label: "Silver", bg: "#F4F3EE", color: "#6a6258" },
  marriottPoints: { label: "Member", bg: "#F4F3EE", color: "#6a6258" },
};
const TIER_FALLBACK = { label: "Member", bg: "#F4F3EE", color: "#6a6258" };

export default function LoyaltyStrip({ loyaltyPoints, email = "" }) {
  const rows = loyaltyRows(loyaltyPoints);
  if (rows.length === 0) return null;

  const tails = loyaltyPoints?.accounts || {};

  return (
    <div className="font-jakarta tabular-nums">
      {rows.map((r, i) => {
        const tier = TIER[r.key] || TIER_FALLBACK;
        return (
          <div
            key={r.key}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < rows.length - 1 ? "border-b border-[#f4f1ec]" : ""
            }`}
          >
            <span
              className="h-9 w-[3px] shrink-0 rounded-[2px]"
              style={{ background: MARKER[r.key] || "#E6B79A" }}
            />

            {/* Name + email + tags */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">{r.label}</p>
              {email && (
                <p className="truncate text-[11px] text-ink-muted">{email}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-[5px] bg-[#F4F3EE] px-2 py-[2px] text-[11px] font-semibold text-ink-soft">
                  ·····{tails[r.key] || "0000"}
                </span>
                <span
                  className="rounded-[5px] px-2 py-[2px] text-[10px] font-bold"
                  style={{ background: tier.bg, color: tier.color }}
                >
                  {tier.label}
                </span>
                {r.isBest && (
                  <span className="inline-flex items-center gap-1 rounded-[5px] bg-[#FBE8E0] px-[7px] py-[2px] text-[9px] font-extrabold uppercase tracking-[0.3px] text-[#c0603c]">
                    <Star className="h-2.5 w-2.5" />
                    Best value now
                  </span>
                )}
              </div>
            </div>

            {/* Points + value */}
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="flex items-center gap-1.5 text-[15px] font-extrabold text-ink">
                {formatPoints(r.points)} pts
                <Chevron className="h-3 w-3 text-ink-muted" />
              </span>
              <span className="text-[12px] font-semibold text-bonza">
                £{r.value.toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Filled star glyph (no emoji).
function Star({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />
    </svg>
  );
}

// Chevron-right glyph (no emoji).
function Chevron({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
