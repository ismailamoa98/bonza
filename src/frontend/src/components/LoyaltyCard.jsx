// components/LoyaltyCard.jsx — The user's loyalty balance, as a rich summary card.
// Source of truth for the homepage: the "Personalized for you" offer's points
// follow this balance (see HomePage). Driven by `loyaltyPoints` — the Plaid mock
// now, real Plaid later. Trend/sparkline/"best use" are illustrative (no history).
// Props: { loyaltyPoints }.

// Per-program value rate (£ per point) — chosen so the mock balance reproduces the
// reference card (50k→£700, 30k→£450, 15k→£155). Replace with live valuations later.
const PROGRAMS = [
  { key: "amex", label: "Amex Membership Rewards", rate: 0.014 },
  { key: "chaseUr", label: "Chase Ultimate Rewards", rate: 0.015 },
  { key: "unitedMiles", label: "United MileagePlus", rate: 0.0103 },
  { key: "marriottPoints", label: "Marriott Bonvoy", rate: 0.007 },
];
const SHADES = ["#B0552F", "#da7756", "#E6B79A", "#EBC9B5"]; // dark -> light by rank

export default function LoyaltyCard({ loyaltyPoints }) {
  if (!loyaltyPoints) return null;

  // Build per-program rows from the live balance, biggest value first.
  const rows = PROGRAMS.map((p) => {
    const points = loyaltyPoints[p.key] || 0;
    return { ...p, points, value: Math.round(points * p.rate) };
  })
    .filter((r) => r.points > 0)
    .sort((a, b) => b.value - a.value)
    .map((r, i) => ({ ...r, shade: SHADES[i] || SHADES[SHADES.length - 1] }));

  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + r.value, 0);
  // "Best value now" = highest £/pt redemption rate.
  const bestKey = rows.reduce((best, r) => (r.rate > best.rate ? r : best), rows[0]).key;
  const pctOf = (v) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return (
    <div className="rounded-2xl border border-[rgba(40,30,20,0.05)] bg-white p-5 font-jakarta tabular-nums shadow-[0_1px_2px_rgba(40,30,20,0.04),0_16px_40px_rgba(120,80,50,0.07)]">
      {/* Meta */}
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[1.2px] text-ink-muted">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9a9088" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Loyalty
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-[#34B368] shadow-[0_0_0_3px_rgba(52,179,104,0.15)]" />
          Synced via Plaid · 2h ago
        </span>
      </div>

      {/* Total travel value */}
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-muted">
        Total travel value
      </p>
      <div className="relative mb-4">
        <svg className="pointer-events-none absolute right-0 -top-1.5 h-[54px] w-[46%] opacity-90" viewBox="0 0 240 56" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lc-spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#da7756" stopOpacity="0.22" />
              <stop offset="1" stopColor="#da7756" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,50 L48,41.9 L96,35.1 L144,27 L192,25 L240,6 L240,56 L0,56 Z" fill="url(#lc-spark)" />
          <path d="M0,50 L48,41.9 L96,35.1 L144,27 L192,25 L240,6" fill="none" stroke="#da7756" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="240" cy="6" r="3" fill="#da7756" />
        </svg>
        <div className="relative z-[2] flex items-center gap-3">
          <p className="text-[32px] font-extrabold leading-none tracking-[-1.2px] text-ink">
            £{total.toLocaleString()}
          </p>
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#EAF6EE] px-2.5 py-1 text-[11px] font-bold text-[#1E7E40]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1E7E40" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 17 9 11 13 15 21 7" />
              <polyline points="15 7 21 7 21 13" />
            </svg>
            £140 · 12% this month
          </span>
        </div>
        <span className="absolute right-0.5 -bottom-0.5 z-[2] text-[9px] font-semibold tracking-[0.5px] text-[#c9a18c]">
          6-MONTH GROWTH
        </span>
      </div>

      {/* Allocation bar */}
      <div className="mb-4 flex gap-[3px]">
        {rows.map((r) => (
          <div key={r.key} className="h-2 rounded-[3px]" style={{ width: `${pctOf(r.value)}%`, background: r.shade }} />
        ))}
      </div>

      {/* Program rows */}
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-2.5 border-t border-[#f4f1ec] py-2 first:border-t-0">
          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]" style={{ background: r.shade }} />
          <span className="text-[13px] font-semibold text-ink">{r.label}</span>
          {r.key === bestKey && (
            <span className="inline-flex items-center gap-0.5 rounded-[10px] bg-[#FBE8E0] px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.4px] text-[#c0603c]">
              ★ BEST VALUE NOW
            </span>
          )}
          <span className="ml-auto text-[11px] font-medium text-[#ada69d]">{r.points.toLocaleString()} pts</span>
          <span className="min-w-[46px] text-right text-[13px] font-bold text-ink">£{r.value.toLocaleString()}</span>
          <span className="min-w-[30px] text-right text-[11px] font-semibold text-[#ada69d]">{pctOf(r.value)}%</span>
        </div>
      ))}

      {/* CTA */}
      <div className="mt-3 flex items-center justify-between border-t border-[#f0ece5] pt-3">
        <span className="flex items-center gap-2.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c0603c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 4.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          <p className="text-[12px] font-medium text-ink-soft">
            Best use: <b className="font-bold text-ink">return to Lisbon + 2 nights</b>
          </p>
        </span>
        <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#c0603c]">
          Explore
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0603c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </div>
  );
}
