// components/RedemptionPanel.jsx — Pro loyalty redemption engine results (transfer partners, award value).
import { useEffect, useRef, useState } from "react";
import { formatGbp, formatPoints, formatCents, cppRating } from "../utils/format";
import { recordAffiliateClick } from "../utils/api";
import PostClickPrompt from "./PostClickPrompt";

const POST_CLICK_DELAY_MS = 60 * 1000;

const PROGRAMME_NAMES = {
  marriott_bonvoy: "Marriott Bonvoy",
  hilton_honors: "Hilton Honors",
  world_of_hyatt: "World of Hyatt",
  ihg_one: "IHG One Rewards",
  amex_mr: "Amex Membership Rewards",
  chase_ur: "Chase Ultimate Rewards",
  united_mp: "United MileagePlus",
  ba_avios: "BA Avios",
  aeroplan: "Air Canada Aeroplan",
};
const programmeName = (key) => PROGRAMME_NAMES[key] || key;

const TYPE_BADGES = {
  points: "POINTS",
  transfer: "TRANSFER",
  hybrid: "HYBRID",
  cash: "CASH",
};

const TONE_CLASSES = {
  good: "bg-[#EAF6EE] text-[#1E7E40]",
  ok: "bg-[#FBF1E6] text-[#b5751f]",
  low: "bg-[#FBE8E0] text-[#c0603c]",
};
const BAR_CLASSES = { good: "bg-[#1E7E40]", ok: "bg-[#d8932f]", low: "bg-[#c0603c]" };

export default function RedemptionPanel({ redemption, loading }) {
  const [showAll, setShowAll] = useState(false);
  const [prompt, setPrompt] = useState(null); // { journeyId, programme, leg } once shown
  const promptTimer = useRef(null);
  useEffect(() => () => clearTimeout(promptTimer.current), []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-[rgba(40,30,20,0.08)] bg-white p-5 font-jakarta">
        <div className="h-3 w-40 animate-pulse rounded bg-cream" />
        <div className="mt-4 h-20 animate-pulse rounded-xl bg-cream" />
        <div className="mt-3 h-10 animate-pulse rounded-lg bg-cream" />
      </section>
    );
  }

  if (!redemption) return null;

  if (redemption.mode === "cash_only" || !redemption.best) {
    return (
      <section className="rounded-2xl border border-bonza/20 bg-white p-5 font-jakarta">
        <PanelHeader />
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          You haven&apos;t connected any loyalty accounts yet — so I can only price this in cash.
          Connect them and I&apos;ll factor your balances into every option.
        </p>
      </section>
    );
  }

  const { best, all = [], journeyId } = redemption;
  const rating = cppRating(best.centsPerPoint, best.benchmarkCpp);
  const fill = best.benchmarkCpp > 0
    ? Math.max(6, Math.min(100, (best.centsPerPoint / (best.benchmarkCpp * 2)) * 100))
    : 50;

  const bookLink = best.affiliateDeepLink || best.deepLink || null;
  const bookProgramme = best.toProgramme || best.programme;
  const handleBook = async () => {
    if (!bookLink) return;
    const leg = best.type === "hybrid" ? "hotel" : "flight";
    try {
      const { affiliateUrl } = await recordAffiliateClick({
        programme: bookProgramme,
        destinationUrl: bookLink,
        bookingType: "points",
        leg,
        journeyId, // stamps the deep-link step on the journey (8l)
      });
      window.open(affiliateUrl || bookLink, "_blank", "noopener");
    } catch {
      window.open(bookLink, "_blank", "noopener");
    }
    if (journeyId) {
      clearTimeout(promptTimer.current);
      promptTimer.current = setTimeout(
        () => setPrompt({ journeyId, programme: bookProgramme, leg }),
        POST_CLICK_DELAY_MS
      );
    }
  };

  return (
    <section className="rounded-2xl border-2 border-bonza bg-white p-5 font-jakarta tabular-nums shadow-[0_1px_2px_rgba(40,30,20,0.04),0_16px_40px_rgba(120,80,50,0.07)]">
      <PanelHeader />

      {/* Best redemption headline */}
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-bold leading-tight text-ink">{best.label}</p>
          {best.cashEquivalentSaved > 0 && (
            <p className="mt-0.5 text-[12px] text-ink-soft">
              Worth <b className="text-ink">{formatGbp(best.cashEquivalentSaved)}</b> in value
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.06em] ${TONE_CLASSES[rating.tone]}`}>
          {rating.label}
        </span>
      </div>

      {/* Points cost */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {best.pointsUsed != null && (
          <Stat label="Points" value={`${formatPoints(best.pointsUsed)} pts`} />
        )}
        {best.pointsToTransfer != null && (
          <Stat label="Transfer" value={`${formatPoints(best.pointsToTransfer)} pts`} />
        )}
        {best.pointsForHotel != null && (
          <Stat label="Hotel points" value={`${formatPoints(best.pointsForHotel)} pts`} />
        )}
        <Stat label="Value" value={`${formatCents(best.centsPerPoint)}/pt`} accent />
      </div>

      {/* ¢/pt vs benchmark bar */}
      {best.benchmarkCpp > 0 && (
        <div className="mt-3">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-cream">
            <span className="absolute left-1/2 top-0 h-full w-px bg-ink/25" aria-hidden="true" />
            <span className={`block h-full rounded-full ${BAR_CLASSES[rating.tone]}`} style={{ width: `${fill}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-ink-muted">
            {formatCents(best.centsPerPoint)}/pt vs {formatCents(best.benchmarkCpp)}/pt benchmark
          </p>
        </div>
      )}

      {best.recommendation && (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{best.recommendation}</p>
      )}

      {/* Transfer irreversibility warning */}
      {best.warning && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-[#FBF1E6] px-3 py-2 text-[12px] text-[#b5751f]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {best.warning}
        </p>
      )}

      {/* Book CTA */}
      {bookLink ? (
        <button
          type="button"
          onClick={handleBook}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-bonza px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-bonza-dark"
        >
          Book with {programmeName(best.toProgramme || best.programme)}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      ) : (
        <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-center text-[12px] text-ink-muted">
          I&apos;ll surface the exact booking link when you proceed.
        </p>
      )}

      {/* All options */}
      {all.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-bonza hover:text-bonza-dark"
          >
            {showAll ? "Hide all options" : `All options (${all.length})`}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={showAll ? "rotate-180" : ""} aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showAll && (
            <ul className="mt-2 space-y-1.5">
              {all.map((o, i) => (
                <li key={`${o.type}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-cream px-3 py-2 text-[13px]">
                  <span className="flex items-center gap-2">
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-[0.06em] text-ink-muted ring-1 ring-inset ring-[rgba(40,30,20,0.12)]">
                      {TYPE_BADGES[o.type] || o.type.toUpperCase()}
                    </span>
                    <span className="text-ink">{o.label}</span>
                  </span>
                  <span className="shrink-0 text-ink-muted">
                    {o.centsPerPoint ? `${formatCents(o.centsPerPoint)}/pt` : formatGbp(o.totalCashGbp || 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {prompt && (
        <PostClickPrompt
          journeyId={prompt.journeyId}
          programme={prompt.programme}
          leg={prompt.leg}
          onClose={() => setPrompt(null)}
        />
      )}
    </section>
  );
}

export function RedemptionAccounts({ accounts = [] }) {
  if (!accounts.length) return null;
  return (
    <section className="rounded-2xl border border-[rgba(40,30,20,0.08)] bg-white p-4 font-jakarta tabular-nums">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Your points</p>
      <ul className="mt-2 space-y-2">
        {accounts.map((a) => (
          <li key={a.programme} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${a.aboveBenchmark ? "bg-[#1E7E40]" : "bg-ink/30"}`} aria-hidden="true" />
              <span className="text-ink">{programmeName(a.programme)}</span>
            </span>
            <span className="text-right text-ink-muted">
              {formatPoints(a.balance)} · <b className="text-ink">{formatGbp(a.valueGbp)}</b>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PanelHeader() {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-bonza">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />
      </svg>
      Best redemption
    </p>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-cream p-2.5">
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p className={`text-[15px] font-extrabold leading-tight ${accent ? "text-[#1E7E40]" : "text-ink"}`}>{value}</p>
    </div>
  );
}
