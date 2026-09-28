// components/points/DiscrepancyModal.jsx — Phase 15. Shown once after a sync that changed balances:
// reports what was updated (statement is the source of truth), with an escape hatch to edit manually.
import { useEffect } from "react";
import ProgrammeLogo from "../common/ProgrammeLogo";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "";

export default function DiscrepancyModal({ updated = [], onClose, onReviewDetails, onResync }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-[rgba(20,18,16,0.42)] backdrop-blur-[3px] flex items-center justify-center p-8 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disc-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[20px] w-full max-w-[560px] shadow-[0_20px_60px_rgba(20,18,16,0.22)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-[1.9rem] pt-7 pb-[1.35rem]">
          <button
            onClick={onResync}
            title="Sync again"
            aria-label="Sync again"
            className="w-[46px] h-[46px] rounded-[14px] bg-[#EAF0F7] text-[#2C5C8F] flex items-center justify-center mb-[1.1rem] hover:bg-[#DBE6F3] transition-colors"
          >
            <RefreshGlyph />
          </button>
          <h2 id="disc-title" className="text-[20px] font-bold text-[#141210] tracking-[-0.5px] mb-[7px]">
            We updated {updated.length} balance{updated.length === 1 ? "" : "s"}
          </h2>
          <p className="text-[14px] text-[#7A7269] leading-[1.55]">
            Your statement emails showed different figures to what you entered. We've used the{" "}
            <strong className="text-[#141210] font-bold">statement values</strong> — they're the source of truth.
          </p>
        </div>

        <div className="px-[1.9rem] tabular-nums max-h-[46vh] overflow-y-auto">
          {updated.map((a) => (
            <div key={a.id} className="flex items-center gap-[0.9rem] py-[0.95rem] border-t border-[#F4F1EC]">
              <ProgrammeLogo programme={a} size={36} radius={10} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#141210] mb-0.5 truncate">{a.displayName}</p>
                <p className="text-[12px] text-[#A69C92]">Statement {fmtDate(a.statementDate)}</p>
              </div>
              <div className="flex items-center gap-[0.55rem] flex-shrink-0">
                <span className="text-[13.5px] text-[#BFB6AA] line-through font-semibold">
                  {a.previousBalance?.toLocaleString()}
                </span>
                <span className="text-[#D6CEC4]">→</span>
                <span className="text-[16px] font-extrabold text-[#1B7040] tracking-[-0.3px]">
                  {a.balance.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-[1.9rem] mt-[1.35rem] bg-[#FAF8F5] rounded-xl px-[1.1rem] py-[0.9rem] flex gap-[0.7rem] items-start">
          <span className="text-[#8A8078] flex-shrink-0 mt-px">
            <InfoGlyph />
          </span>
          <p className="text-[12.5px] text-[#7A7269] leading-[1.5]">
            Think a statement is wrong? You can{" "}
            <button onClick={onReviewDetails} className="text-bonza font-semibold">
              edit any balance manually
            </button>{" "}
            — we'll keep your value until the next statement arrives.
          </p>
        </div>

        <div className="px-[1.9rem] pt-[1.4rem] pb-7 flex gap-[0.6rem] justify-end">
          <button
            onClick={onReviewDetails}
            className="text-[13.5px] font-semibold px-[22px] py-[11px] rounded-full border-[1.5px] border-[#EDE8E1] bg-white text-[#4A423B] hover:bg-[#FAF8F5]"
          >
            Review details
          </button>
          <button
            onClick={onClose}
            className="text-[13.5px] font-semibold px-[22px] py-[11px] rounded-full bg-[#141210] text-white hover:bg-[#332B25]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

const G = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const RefreshGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...G}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <polyline points="21 3 21 9 15 9" />
  </svg>
);
const InfoGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...G}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
