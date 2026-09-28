// components/points/ProgrammeRow.jsx — one programme row: name + membership tier + expiry, and the balance.
// Deliberately minimal: no provenance/best-rate/transferable tags and no per-point rate (the app surfaces
// the best use of points via transfers, so a raw rate reads as misleading). Membership tier only.
import { ChevronRightIcon } from "./icons";
import { formatUpdatedAt } from "../../utils/format";
import ProgrammeLogo from "../common/ProgrammeLogo";

// Phase 15 sync-state pills (statement-authoritative). Muted, no amber.
const STATE_PILL = {
  updated: { bg: "#EAF0F7", fg: "#2C5C8F", label: "Updated" },
  verified: { bg: "#EAF4ED", fg: "#1B7040", label: "Verified" },
  not_checked: { bg: "#F4F1EC", fg: "#7A6A58", label: "Not checked" },
};

// Readable text colour for a brand-coloured pill: dark ink on light brands (e.g. Hertz gold),
// white on dark ones — using perceived luminance so every programme's tier tag stays legible.
function readableOn(hex) {
  const c = String(hex || "#9a9088").replace("#", "");
  if (c.length < 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#2a2420" : "#ffffff";
}

export default function ProgrammeRow({ account, open, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 py-[15px] px-0.5 cursor-pointer transition-colors border-b ${
        open ? "bg-white/[0.72] border-transparent" : "border-ink-900/[0.07] hover:bg-white/50"
      }`}
    >
      {/* Left — logo + name + meta */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <ProgrammeLogo programme={account} size={40} radius={12} />
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold mb-[3px] truncate" style={{ color: account.brandColor || "#2a2420" }}>
            {account.displayName}
          </p>
          <div className="flex items-center gap-[7px] flex-wrap">
            {(() => {
              // Manual edits show an "Edited" marker (held until the next statement); otherwise the sync state.
              if (account.manualOverride)
                return (
                  <span className="text-[10px] font-semibold px-[7px] py-[1.5px] rounded-[5px] bg-[#F4F1EC] text-[#7A6A58]">
                    Edited
                  </span>
                );
              const p = STATE_PILL[account.syncState || "not_checked"];
              return p ? (
                <span className="text-[10px] font-semibold px-[7px] py-[1.5px] rounded-[5px]" style={{ background: p.bg, color: p.fg }}>
                  {p.label}
                </span>
              ) : null;
            })()}
            {account.accountMasked && (
              <span className="font-mono text-[10.5px] text-ink-300">{account.accountMasked}</span>
            )}
            {account.statusTier && (
              <span
                className="text-[10.5px] font-bold px-[7px] py-[1.5px] rounded-[5px]"
                style={{ background: account.brandColor || "#9a9088", color: readableOn(account.brandColor) }}
              >
                {account.statusTier}
              </span>
            )}
            {account.daysToExpiry !== null && account.daysToExpiry <= 120 && (
              <span className="text-[10px] font-semibold px-[7px] py-[1.5px] rounded-[5px] bg-[#FBF0DC] text-[#96450A]">
                Expires in {account.daysToExpiry} days
              </span>
            )}
            {account.lastSynced && (
              <span className="text-[10.5px] text-ink-300">Updated {formatUpdatedAt(account.lastSynced)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right — balance, chevron */}
      <div className="flex items-center gap-6 flex-shrink-0 tabular-nums">
        <div className="text-right min-w-[70px]">
          <p className="text-[9.5px] text-ink-300/80 font-medium mb-0.5">Balance</p>
          <p className="text-[13px] font-semibold text-ink-900">{account.balance.toLocaleString()}</p>
        </div>
        <span className={`text-ink-300 w-4 flex justify-end transition-transform ${open ? "rotate-90 text-ink-600" : ""}`}>
          <ChevronRightIcon width="15" height="15" />
        </span>
      </div>
    </div>
  );
}
