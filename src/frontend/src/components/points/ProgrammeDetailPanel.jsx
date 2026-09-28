// components/points/ProgrammeDetailPanel.jsx — expanded panel: four summary stats + the transfer table
// (or the terminal-currency message when a programme has no partners).
import { useState, useEffect } from "react";
import { openSearch } from "../../utils/searchUrl";
import { getProgrammeDetail } from "../../utils/api";
import { formatUpdatedAt } from "../../utils/format";
import { RefreshIcon, InfoIcon, AlertTriangleIcon, ArrowRightIcon } from "./icons";

export default function ProgrammeDetailPanel({ accountId, rowAccount, onEdit }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProgrammeDetail(accountId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (loading) {
    return <div className="bg-white/[0.72] rounded-b-xl px-[18px] pb-[18px] border-b border-ink-900/[0.07] h-48 animate-pulse" />;
  }
  if (!detail) return null;

  const { account, heldValueGbp, bestTransfer, holdIsBetter, transferOptions, ratesLastRefreshed } = detail;
  const visible = showAll ? transferOptions : transferOptions.slice(0, 7);
  const hidden = transferOptions.length - visible.length;

  return (
    <div className="bg-white/[0.72] rounded-b-xl px-[18px] pb-[18px] border-b border-ink-900/[0.07] mb-0.5">
      {/* Four summary stats */}
      <div className="flex gap-10 pt-1 pb-4 border-b border-ink-900/[0.07] mb-3.5 tabular-nums">
        <Stat label="Balance" value={`${account.balance.toLocaleString()} ${account.currency}`} sub={account.displayName} />
        <Stat
          label="Best transfer"
          value={bestTransfer ? `£${bestTransfer.valueGbp.toFixed(0)}` : "—"}
          valueClass={holdIsBetter ? "text-[#96450A]" : "text-[#186334]"}
          sub={
            bestTransfer
              ? holdIsBetter
                ? "worse than holding"
                : `${bestTransfer.displayName} · +£${bestTransfer.upliftGbp.toFixed(0)}`
              : "no transfer partners"
          }
        />
        <Stat
          label="Status"
          value={account.statusTier || "Member"}
          sub={
            account.nightsThisYear
              ? `${account.nightsThisYear} nights this year`
              : account.statusRenewsAt
                ? `renews ${new Date(account.statusRenewsAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                : ""
          }
        />

        {rowAccount && (
          <div className="ml-auto self-start flex flex-col items-end gap-1.5">
            {rowAccount.lastSynced && (
              <span className="text-[10.5px] text-ink-300">
                Updated {formatUpdatedAt(rowAccount.lastSynced, { withTime: true })}
              </span>
            )}
            {/* Self-reported programmes have no email sync — let the user correct the balance by hand. */}
            {rowAccount.verifyMethod === "manual" && onEdit && (
              <button
                onClick={() => onEdit(rowAccount)}
                className="text-[11.5px] font-medium px-3 py-1.5 rounded-md border border-ink-900/[0.14] bg-white text-ink-600 hover:bg-[#FBFAF8]"
              >
                Edit balance
              </button>
            )}
          </div>
        )}
      </div>

      {transferOptions.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10.5px] font-bold text-ink-600/70 tracking-[0.7px] uppercase">Transfer options</span>
            <span className="text-[10.5px] text-ink-300 flex items-center gap-1.5">
              <RefreshIcon width="11" height="11" />
              Rates updated nightly · last run{" "}
              {ratesLastRefreshed
                ? new Date(ratesLastRefreshed).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </span>
          </div>

          <div className="tabular-nums">
            <div className="grid grid-cols-[1fr_66px_88px_62px_76px] gap-3 px-1.5 pb-1.5">
              {["Partner", "Ratio", "You'd get", "Rate", "Value"].map((h, i) => (
                <span key={h} className={`text-[9.5px] font-semibold text-ink-300/80 tracking-[0.3px] ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </span>
              ))}
            </div>

            {visible.map((opt) => (
              <div
                key={opt.programme}
                className={`grid grid-cols-[1fr_66px_88px_62px_76px] gap-3 px-1.5 py-2 border-t border-ink-900/[0.055] items-center rounded-md hover:bg-white/[0.85] transition-colors ${
                  opt === transferOptions[0] && !holdIsBetter ? "bg-[#E4F0E7]/[0.45]" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: opt.brandColor }} />
                  <span className="text-[12px] font-medium text-ink-600 truncate">{opt.displayName}</span>
                  {opt === transferOptions[0] && !holdIsBetter && (
                    <span className="text-[8.5px] font-bold text-[#186334] bg-[#DCEBE1] px-1.5 py-px rounded flex-shrink-0">BEST</span>
                  )}
                  {opt.upliftGbp < 0 && (
                    <span className="text-[8.5px] font-bold text-[#96450A] bg-[#FBF0DC] px-1.5 py-px rounded flex-shrink-0">
                      −£{Math.abs(opt.upliftGbp).toFixed(0)}
                    </span>
                  )}
                  {opt.bonusActive && (
                    <span className="text-[8.5px] font-bold text-[#5B3F95] bg-[#EEE9F6] px-1.5 py-px rounded flex-shrink-0">
                      +{opt.bonusPercent}% BONUS
                    </span>
                  )}
                </div>
                <span className="text-[12px] text-ink-600 text-right font-medium">{opt.ratio}</span>
                <span className="text-[12px] font-semibold text-ink-900 text-right">{opt.resultingBalance.toLocaleString()}</span>
                <span
                  className={`text-[12px] font-semibold text-right ${
                    opt.centsPerPoint >= 1.4 ? "text-[#186334]" : opt.centsPerPoint >= 1.0 ? "text-ink-600" : "text-[#96450A]"
                  }`}
                >
                  {opt.centsPerPoint.toFixed(1)}¢
                </span>
                <span className="text-[12px] font-semibold text-ink-900 text-right">£{opt.valueGbp.toFixed(0)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-ink-900/[0.07]">
            <span className="text-[10.5px] text-ink-300 flex items-center gap-1.5">
              {holdIsBetter ? <InfoIcon width="12" height="12" /> : <AlertTriangleIcon width="12" height="12" />}
              {holdIsBetter
                ? `Holding your ${account.displayName} points is better value than any transfer right now`
                : "Transfers are irreversible — confirm award availability before moving points"}
            </span>
            <div className="flex gap-2">
              {hidden > 0 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-[11.5px] font-medium px-3 py-1.5 rounded-md border border-ink-900/[0.14] bg-white text-ink-600 hover:bg-[#FBFAF8]"
                >
                  Show {hidden} more
                </button>
              )}
              <button
                onClick={() => openSearch(`/search?programme=${bestTransfer && !holdIsBetter ? bestTransfer.programme : account.programme}`)}
                className="text-[11.5px] font-medium px-3 py-1.5 rounded-md bg-bonza text-white border border-bonza hover:bg-bonza-dark flex items-center gap-1.5"
              >
                Find awards with{" "}
                {(bestTransfer && !holdIsBetter ? bestTransfer.displayName : account.displayName).split(" ")[0]}
                <ArrowRightIcon width="12" height="12" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between py-2">
          <span className="text-[11.5px] text-ink-300">
            {account.displayName} has no transfer partners — points can only be redeemed within the programme.
          </span>
          <button
            onClick={() => openSearch(`/search?programme=${account.programme}`)}
            className="text-[11.5px] font-medium px-3 py-1.5 rounded-md bg-bonza text-white flex items-center gap-1.5"
          >
            Find awards <ArrowRightIcon width="12" height="12" />
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, valueClass = "text-ink-900" }) {
  return (
    <div>
      <p className="text-[9.5px] font-semibold text-ink-300/80 tracking-[0.4px] uppercase mb-1">{label}</p>
      <p className={`text-[16px] font-bold tracking-[-0.3px] ${valueClass}`}>{value}</p>
      {sub && <p className="text-[10.5px] text-ink-300 mt-[3px]">{sub}</p>}
    </div>
  );
}
