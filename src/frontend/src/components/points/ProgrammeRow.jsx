// components/points/ProgrammeRow.jsx — one programme row: name + status/expiry/rate badges, balance, rate.
import { ChevronRightIcon, CheckIcon } from "./icons";
import { formatUpdatedAt } from "../../utils/format";

function isEliteTier(tier) {
  return /platinum|titanium|diamond|globalist|gold|ambassador|1k/i.test(tier || "");
}

export default function ProgrammeRow({ account, open, onClick }) {
  const rateClass = account.aboveBenchmark
    ? "text-[#186334]"
    : account.centsPerPoint < account.benchmarkCpp * 0.8
      ? "text-[#96450A]"
      : "text-ink-900";

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 py-[15px] px-0.5 cursor-pointer transition-colors border-b ${
        open ? "bg-white/[0.72] border-transparent" : "border-ink-900/[0.07] hover:bg-white/50"
      }`}
    >
      {/* Left — name + meta */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="w-2 h-2 rounded-[3px] flex-shrink-0" style={{ background: account.brandColor }} />
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-ink-900 mb-[3px]">{account.displayName}</p>
          <div className="flex items-center gap-[7px] flex-wrap">
            {account.accountMasked && (
              <span className="font-mono text-[10.5px] text-ink-300">{account.accountMasked}</span>
            )}
            {account.statusTier && (
              <span
                className={`text-[10.5px] font-semibold ${
                  isEliteTier(account.statusTier)
                    ? "bg-gradient-to-br from-[#8a6a3a] to-[#6b4f26] bg-clip-text text-transparent font-bold"
                    : "text-ink-600"
                }`}
              >
                {account.statusTier}
              </span>
            )}
            {account.daysToExpiry !== null && account.daysToExpiry <= 120 && (
              <span className="text-[10px] font-semibold px-[7px] py-[1.5px] rounded-[5px] bg-[#FBF0DC] text-[#96450A]">
                Expires in {account.daysToExpiry} days
              </span>
            )}
            {account.aboveBenchmark && (
              <span className="text-[10px] font-semibold px-[7px] py-[1.5px] rounded-[5px] bg-[#E4F0E7] text-[#186334]">
                Best rate
              </span>
            )}
            {account.isTransferable && (
              <span className="text-[10px] font-semibold px-[7px] py-[1.5px] rounded-[5px] bg-[#EEE9F6] text-[#5B3F95]">
                Transferable
              </span>
            )}
            {account.syncMethod === "email_parse" ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-[7px] py-[1.5px] rounded-[5px] bg-[#E4F0E7] text-[#186334]">
                <CheckIcon width="10" height="10" /> Verified
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-[7px] py-[1.5px] rounded-[5px] bg-ink-900/[0.05] text-ink-600">
                Self-reported
              </span>
            )}
            {account.lastSynced && (
              <span className="text-[10.5px] text-ink-300">Updated {formatUpdatedAt(account.lastSynced)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right — balance, rate, chevron */}
      <div className="flex items-center gap-6 flex-shrink-0 tabular-nums">
        <div className="text-right min-w-[70px]">
          <p className="text-[9.5px] text-ink-300/80 font-medium mb-0.5">Balance</p>
          <p className="text-[13px] font-semibold text-ink-900">{account.balance.toLocaleString()}</p>
        </div>
        <div className="text-right min-w-[70px]">
          <p className="text-[9.5px] text-ink-300/80 font-medium mb-0.5">Rate</p>
          <p className={`text-[13px] font-semibold ${rateClass}`}>
            {account.hasPointsProgramme === false ? "—" : `${account.centsPerPoint.toFixed(1)}¢`}
          </p>
        </div>
        <span className={`text-ink-300 w-4 flex justify-end transition-transform ${open ? "rotate-90 text-ink-600" : ""}`}>
          <ChevronRightIcon width="15" height="15" />
        </span>
      </div>
    </div>
  );
}
