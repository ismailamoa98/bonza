// components/points/PointsActivitySection.jsx — Phase 14 two-card activity section on /points.
// Left: "How you earned" month ladder (from monthlyEarned). Right: "Recent activity" (five latest rows).
// Read-only, presentation only — data comes from GET /points/activity. Honest empty state when no rows.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { openSearch } from "../../utils/searchUrl";
import { getPointsActivity } from "../../utils/api";

// Last 4 months as "Sep 26"-style labels (matches the backend's en-GB month/2-digit keys), oldest first.
function lastFourMonths() {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 3; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(m.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }));
  }
  return out;
}

const fmtDay = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const KIND_TONE = {
  earn: { bg: "#E6F2EA", fg: "#156B3B" },
  transfer_in: { bg: "#F4EDF7", fg: "#7A4E96" },
  transfer_out: { bg: "#F4EDF7", fg: "#7A4E96" },
  spend: { bg: "#FDF3E0", fg: "#9A6B13" },
  expiry: { bg: "#FDF3E0", fg: "#9A6B13" },
  adjustment: { bg: "#F0EEE9", fg: "#6a6258" },
};

export default function PointsActivitySection() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPointsActivity({ limit: 5 })
      .then(setData)
      .catch(() => setData({ activity: [], monthlyEarned: {}, totalEarned: 0 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="mt-9 h-[220px] rounded-2xl bg-white/50 animate-pulse" />;

  const months = lastFourMonths();
  const monthly = data?.monthlyEarned || {};
  const activity = data?.activity || [];
  const totalEarned = data?.totalEarned || 0;

  return (
    <div className="mt-10">
      <p className="text-[10.5px] font-bold text-ink-600/70 tracking-[0.9px] uppercase mb-3">Activity</p>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-4">
        {/* Left — How you earned */}
        <div className="rounded-2xl bg-white shadow-sm border border-ink-900/[0.06] p-5">
          <p className="text-[13px] font-bold text-ink-900 mb-3.5">How you earned</p>
          <div className="space-y-2">
            {months.map((m) => {
              const v = monthly[m] || 0;
              return (
                <div key={m} className="flex items-center justify-between">
                  <span className="text-[12.5px] text-ink-600">{m}</span>
                  {v > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-[3px] rounded-md bg-[#E6F2EA] text-[#156B3B] tabular-nums">
                      <ArrowUpRight /> {v.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[12px] font-medium px-2 py-[3px] rounded-md bg-[#F0EEE9] text-ink-300 tabular-nums">0</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-ink-900/[0.07]">
            <span className="text-[12px] text-ink-600">Earned last 4 months</span>
            <span className="text-[22px] font-extrabold text-ink-900 tabular-nums tracking-[-0.5px]">
              {totalEarned.toLocaleString()}
            </span>
          </div>
          <button
            onClick={() => openSearch("/search")}
            className="mt-3.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-bonza hover:text-bonza-dark"
          >
            <Sparkles /> Find ways to earn faster
          </button>
        </div>

        {/* Right — Recent activity */}
        <div className="rounded-2xl bg-white shadow-sm border border-ink-900/[0.06] p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-bold text-ink-900">Recent activity</p>
            {(data?.hasMore || activity.length >= 5) && (
              <button onClick={() => navigate("/bookings")} className="text-[12px] font-semibold text-bonza hover:text-bonza-dark">
                View all
              </button>
            )}
          </div>
          {activity.length === 0 ? (
            <p className="text-[12.5px] text-ink-300 py-6 text-center">
              No activity yet — your earns, spends and transfers will show here.
            </p>
          ) : (
            <div className="divide-y divide-ink-900/[0.06]">
              {activity.map((a) => {
                const tone = KIND_TONE[a.kind] || KIND_TONE.adjustment;
                const positive = a.amount > 0;
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                      style={{ background: tone.bg, color: tone.fg }}
                    >
                      <KindIcon kind={a.kind} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-ink-900 truncate">{a.description}</p>
                      <p className="text-[11px] text-ink-300 truncate">
                        {a.programmeName}
                        {a.detail ? ` · ${a.detail}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] text-ink-300 tabular-nums flex-shrink-0">{fmtDay(a.occurredAt)}</span>
                    <span title={a.confidence === "confirmed" ? "Confirmed" : "Inferred from a balance change"} className="flex-shrink-0">
                      {a.confidence === "confirmed" ? (
                        <span className="w-4 h-4 rounded-full bg-[#141210] text-white flex items-center justify-center">
                          <Check />
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-[#EFEDE8] text-ink-300 flex items-center justify-center">
                          <Clock />
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-[15px] font-extrabold tabular-nums text-right min-w-[82px] flex-shrink-0 ${
                        positive ? "text-[#156B3B]" : "text-[#141210]"
                      }`}
                    >
                      {positive ? "+" : "−"}
                      {Math.abs(a.amount).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── inline icons (no icon dependency, no emoji) ──
const S = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
function KindIcon({ kind }) {
  if (kind === "transfer_in" || kind === "transfer_out")
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" {...S}>
        <path d="M3 8h14M13 4l4 4-4 4M21 16H7M11 20l-4-4 4-4" />
      </svg>
    );
  if (kind === "spend" || kind === "expiry")
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" {...S}>
        <path d="M7 7l10 10M17 7v10H7" />
      </svg>
    );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...S}>
      <path d="M7 17L17 7M7 7h10v10" />
    </svg>
  );
}
const ArrowUpRight = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" {...S}>
    <path d="M7 17L17 7M7 7h10v10" />
  </svg>
);
const Check = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" {...S}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const Clock = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" {...S}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const Sparkles = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...S}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
  </svg>
);
