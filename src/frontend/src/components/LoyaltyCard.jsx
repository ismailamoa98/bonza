// components/LoyaltyCard.jsx — The user's loyalty balance (Plaid-mock).
// Two variants, both reading the SAME `loyaltyPoints` data:
//   "full"  — the polished dashboard card (lock header + live-sync dot, total value
//             with sparkline, allocation bar, per-program rows, ★ best-value tag, CTA).
//   "strip" — a glassy translucent white-text pill for the cinematic hero.
// Keep the loyalty-drives-offers decoupling: this shows the balance; PackageCards show
// their own redemption cost. Best value now = the program with the highest cents-per-
// point rate (NOT the largest balance). Props: { loyaltyPoints, variant }.
import { formatPoints } from "../utils/format";

// Per-program value rate (£ per point) — chosen so the mock balance reproduces the
// reference card (50k→£700, 30k→£450, 15k→£155). Replace with live valuations later.
const PROGRAMS = [
  { key: "amex", label: "Amex Membership Rewards", short: "Amex", rate: 0.014 },
  { key: "chaseUr", label: "Chase Ultimate Rewards", short: "Chase", rate: 0.015 },
  { key: "unitedMiles", label: "United MileagePlus", short: "United", rate: 0.0103 },
  { key: "marriottPoints", label: "Marriott Bonvoy", short: "Marriott", rate: 0.007 },
];
const SHADES = ["#B0552F", "#da7756", "#E6B79A", "#EBC9B5"]; // dark -> light by rank

// Build per-program rows from the live balance (value-desc), plus totals + best key.
// `pointsUsed` (a pending redemption) is drawn from the transferable pool — Amex
// first, then Chase — mirroring the optimizer's availablePoints, so each row can
// show its projected (post-spend) balance.
function buildModel(loyaltyPoints, pointsUsed = 0) {
  if (!loyaltyPoints) return null;

  let remaining = Math.max(0, Math.round(pointsUsed));
  const spentBy = {};
  for (const key of ["amex", "chaseUr"]) {
    const avail = loyaltyPoints[key] || 0;
    const d = Math.min(avail, remaining);
    if (d > 0) spentBy[key] = d;
    remaining -= d;
  }

  const rows = PROGRAMS.map((p) => {
    const points = loyaltyPoints[p.key] || 0;
    const spent = spentBy[p.key] || 0;
    const projPoints = points - spent;
    return {
      ...p,
      points,
      spent,
      projPoints,
      value: Math.round(points * p.rate),
      projValue: Math.round(projPoints * p.rate),
    };
  })
    .filter((r) => r.points > 0)
    .sort((a, b) => b.value - a.value)
    .map((r, i) => ({ ...r, shade: SHADES[i] || SHADES[SHADES.length - 1] }));
  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + r.value, 0);
  const projTotal = rows.reduce((s, r) => s + r.projValue, 0);
  // Best value now = highest cents-per-point rate among held programs.
  const best = rows.reduce((b, r) => (r.rate > b.rate ? r : b), rows[0]);
  const spending = pointsUsed > 0 && projTotal !== total;
  return {
    rows,
    total,
    projTotal,
    best,
    spending,
    // Allocation is shown post-spend so the bar visibly shrinks as points are used.
    pctOf: (v) => (projTotal > 0 ? Math.round((v / projTotal) * 100) : 0),
  };
}

// The user's best-value program right now (highest ¢/pt among held balances), or
// null if no balance. Exposed so the dashboard can sort offers by it WITHOUT
// changing what any PackageCard shows (keeps loyalty-drives-offers decoupling).
export function bestProgram(loyaltyPoints) {
  if (!loyaltyPoints) return null;
  const held = PROGRAMS.filter((p) => (loyaltyPoints[p.key] || 0) > 0);
  if (held.length === 0) return null;
  return held.reduce((b, r) => (r.rate > b.rate ? r : b), held[0]);
}

// Held programs as display rows (value-desc), each with its £ value and an `isBest`
// flag (highest ¢/pt). Reuses the single PROGRAMS rate table so the dashboard
// loyalty strip stays in sync with this card. Returns [] when there's no balance.
export function loyaltyRows(loyaltyPoints) {
  if (!loyaltyPoints) return [];
  const best = bestProgram(loyaltyPoints);
  return PROGRAMS.map((p) => ({
    key: p.key,
    label: p.label,
    short: p.short,
    rate: p.rate,
    points: loyaltyPoints[p.key] || 0,
    value: Math.round((loyaltyPoints[p.key] || 0) * p.rate),
  }))
    .filter((r) => r.points > 0)
    .sort((a, b) => b.value - a.value)
    .map((r) => ({ ...r, isBest: best ? r.key === best.key : false }));
}

export default function LoyaltyCard({ loyaltyPoints, variant = "full", pointsUsed = 0 }) {
  const model = buildModel(loyaltyPoints, pointsUsed);
  if (!model) return null;
  const { rows, total, projTotal, best, spending, pctOf } = model;

  // ── STRIP variant — glassy hero pill ────────────────────────────────────
  if (variant === "strip") {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 font-jakarta text-white tabular-nums backdrop-blur sm:rounded-full">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/85">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Loyalty via Plaid
        </span>

        <span className="flex items-baseline gap-1.5">
          <b className="text-[15px] font-extrabold">£{total.toLocaleString()}</b>
          <span className="inline-flex items-center gap-0.5 rounded-md bg-[#34B368]/25 px-1.5 py-0.5 text-[10px] font-bold text-[#bdf3d2]">
            ↑ 12%
          </span>
        </span>

        <span className="hidden items-center gap-2 text-[12px] text-white/80 sm:flex">
          {rows.map((r) => (
            <span key={r.key}>
              {r.short} <b className="font-semibold text-white">{formatPoints(r.points)}</b>
            </span>
          ))}
        </span>

        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.4px] text-white">
          <Star className="h-2.5 w-2.5" />
          Best value now: {best.short}
        </span>
      </div>
    );
  }

  // ── FULL variant (default) — dashboard card ─────────────────────────────
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

      {/* Total travel value — flips to the projected balance while points are spent */}
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-muted">
        {spending ? "Balance after this trip" : "Total travel value"}
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-[30px] font-extrabold leading-none tracking-[-1px] text-ink transition-all">
          £{(spending ? projTotal : total).toLocaleString()}
        </p>
        {spending ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-bonza-100 px-2 py-1 text-[11px] font-bold tabular-nums text-bonza-dark">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
            {pointsUsed.toLocaleString()} pts · was £{total.toLocaleString()}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#EAF6EE] px-2 py-1 text-[11px] font-bold text-[#1E7E40]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1E7E40" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 17 9 11 13 15 21 7" />
              <polyline points="15 7 21 7 21 13" />
            </svg>
            £140 · 12% this month
          </span>
        )}
      </div>

      {/* Allocation bar */}
      <div className="mb-4 flex gap-[3px]">
        {rows.map((r) => (
          <div
            key={r.key}
            className="h-2 rounded-[3px] transition-all duration-300"
            style={{ width: `${pctOf(r.projValue)}%`, background: r.shade }}
          />
        ))}
      </div>

      {/* Program rows — two lines each so nothing overflows the narrow rail */}
      {rows.map((r) => (
        <div key={r.key} className="border-t border-[#f4f1ec] py-2.5 first:border-t-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: r.shade }} />
            <span className="truncate text-[13px] font-semibold text-ink">{r.label}</span>
            {r.key === best.key && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-[#FBE8E0] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.4px] text-[#c0603c]">
                <Star className="h-2.5 w-2.5" />
                Best value
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 pl-[18px] text-[11px] tabular-nums text-ink-muted">
            {r.spent > 0 ? (
              <span>
                <span className="text-ink-muted line-through">{r.points.toLocaleString()}</span>
                {" → "}
                <span className="font-bold text-bonza">{r.projPoints.toLocaleString()}</span> pts
              </span>
            ) : (
              <span>{r.points.toLocaleString()} pts</span>
            )}
            <span className="ml-auto text-[13px] font-bold text-ink">£{r.projValue.toLocaleString()}</span>
            <span className="w-9 shrink-0 text-right">{pctOf(r.projValue)}%</span>
          </div>
        </div>
      ))}

      {/* CTA */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#f0ece5] pt-3">
        <span className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c0603c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 4.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          <p className="text-[12px] font-medium text-ink-soft">
            Best use: <b className="font-bold text-ink">a points-rich getaway</b>
          </p>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[12px] font-bold text-[#c0603c]">
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

// Filled star glyph (replaces the ★ character).
function Star({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />
    </svg>
  );
}
