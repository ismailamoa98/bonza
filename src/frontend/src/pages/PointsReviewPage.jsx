// pages/PointsReviewPage.jsx — Phase 15 statement-authoritative balance review. Reports what the last sync
// did (Updated / Verified / Duplicate / Not checked) — statement emails are the source of truth, so there
// are no per-row decisions. A discrepancy modal summarises what changed; manual edits hold until the next
// statement. Reads GET /points/review (seeded in dev).
import { forwardRef, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPointsReview,
  acknowledgeReview,
  setManualBalance,
  deleteDuplicate,
  removeAccount,
  getLoyaltyProviders,
  startLoyaltyOAuth,
} from "../utils/api";
import ProgrammeLogo from "../components/common/ProgrammeLogo";
import DiscrepancyModal from "../components/points/DiscrepancyModal";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "");
const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";

const PILL = {
  updated: { bg: "#EAF0F7", fg: "#2C5C8F", label: "Updated", icon: "refresh" },
  verified: { bg: "#EAF4ED", fg: "#1B7040", label: "Verified", icon: "check" },
  duplicate: { bg: "#F4EDF7", fg: "#7A4E96", label: "Duplicate", icon: "copy" },
  not_checked: { bg: "#F4F1EC", fg: "#7A6A58", label: "Not checked", icon: "mailoff" },
};

export default function PointsReviewPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [configurable, setConfigurable] = useState(null);
  const updatedRef = useRef(null);

  const load = async () => {
    const d = await getPointsReview();
    setData(d);
    return d;
  };

  useEffect(() => {
    (async () => {
      try {
        const d = await load();
        if (d.lastRun?.modalPending && d.lastRun?.balancesUpdated > 0) setModalOpen(true);
        if (!d.emailConnected?.gmail && !d.emailConnected?.outlook) {
          const p = await getLoyaltyProviders().catch(() => ({}));
          setConfigurable(["gmail", "outlook"].find((x) => p[x]?.configured && !p[x]?.connected) || null);
        }
      } catch {
        setData({ grouped: { updated: [], verified: [], duplicate: [], notChecked: [] }, lastRun: null, emailConnected: {} });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const acknowledge = () => acknowledgeReview().catch(() => {});
  const closeModal = () => {
    acknowledge();
    setModalOpen(false);
  };
  const reviewDetails = () => {
    acknowledge();
    setModalOpen(false);
    setTimeout(() => updatedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  const resync = () => {
    acknowledge();
    setModalOpen(false);
    navigate("/points/connecting");
  };

  const g = data?.grouped || { updated: [], verified: [], duplicate: [], notChecked: [] };
  const lastRun = data?.lastRun;
  // The freshness that matters is the statement itself, not when the user pressed refresh. Show the most
  // recent statement date across the programmes we actually read from email.
  const latestStatement = [...g.updated, ...g.verified]
    .map((r) => r.statementDate)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div className="min-h-screen bg-[#F6F4F0]">
      <div className="max-w-[800px] mx-auto px-8 pt-10 pb-12">
        <button onClick={() => navigate("/points")} className="text-[12.5px] text-[#8A8078] hover:text-[#141210] mb-6">
          ← Back to Points
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-[27px] font-bold text-[#141210] tracking-[-0.8px] mb-1.5">Balance review</h1>
            <p className="text-[14px] text-[#8A8078] leading-[1.55] max-w-[440px]">
              Your statement emails are the source of truth. Where a statement was found, we've used it.
              Everything else stays as you entered it.
            </p>
          </div>
          {(latestStatement || lastRun?.completedAt) && (
            <div className="text-right flex-shrink-0">
              <p className="text-[10.5px] font-bold text-[#A69C92] tracking-[1px] uppercase mb-1.5">
                {latestStatement ? "Statements as of" : "Last checked"}
              </p>
              <p className="inline-flex items-center gap-2 text-[13px] text-[#4A423B] font-medium">
                <span className="w-[7px] h-[7px] rounded-full bg-[#1B7040] shadow-[0_0_0_3px_rgba(27,112,64,0.15)]" />
                {latestStatement ? fmtDate(latestStatement) : fmtTime(lastRun.completedAt)}
              </p>
              {latestStatement && lastRun?.completedAt && (
                <p className="text-[11px] text-[#A69C92] mt-1">Checked {fmtTime(lastRun.completedAt)}</p>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <Section ref={updatedRef} label="Updated from statement" rows={g.updated} onChanged={load} configurable={configurable} setConfigurable={setConfigurable} />
            <Section label="Verified from email" rows={g.verified} onChanged={load} configurable={configurable} setConfigurable={setConfigurable} />
            <Section label="Duplicate entry" rows={g.duplicate} onChanged={load} configurable={configurable} setConfigurable={setConfigurable} />
            <Section
              label="Not checked"
              rows={g.notChecked}
              onChanged={load}
              showConnect={!data?.emailConnected?.gmail && !data?.emailConnected?.outlook}
              configurable={configurable}
              setConfigurable={setConfigurable}
            />

            {g.updated.length + g.verified.length + g.duplicate.length + g.notChecked.length === 0 && (
              <p className="text-[13.5px] text-[#8A8078] py-6">Nothing to review yet — add a programme on the Points page.</p>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-9 pt-5 border-t border-[rgba(26,22,19,0.06)]">
          <span className="inline-flex items-center gap-2 text-[11.5px] text-[#8A8078]">
            <LockGlyph /> Bonza reads statement emails only.
          </span>
          <button
            onClick={() => navigate("/points")}
            className="text-[13.5px] font-semibold px-6 py-3 rounded-xl bg-[#141210] text-white hover:bg-[#332B25]"
          >
            Done
          </button>
        </div>
      </div>

      {modalOpen && (
        <DiscrepancyModal updated={g.updated} onClose={closeModal} onReviewDetails={reviewDetails} onResync={resync} />
      )}
    </div>
  );
}

const Section = forwardRef(function Section({ label, rows, onChanged, showConnect, configurable, setConfigurable }, ref) {
  if (!rows.length && !showConnect) return null;
  return (
    <section ref={ref} className="mb-8">
      <div className="flex items-center justify-between px-1 mb-2.5">
        <span className="text-[12px] font-bold text-[#8A8078] tracking-[1.1px] uppercase">{label}</span>
        {rows.length > 0 && (
          <span className="text-[11.5px] text-[#A69C92]">
            {rows.length} programme{rows.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {showConnect && (
        <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(20,18,16,0.04)] p-4 mb-2.5 flex items-start gap-3">
          <span className="w-9 h-9 rounded-[11px] bg-[#F4F1EC] text-[#7A6A58] flex items-center justify-center flex-shrink-0">
            <MailOffGlyph />
          </span>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-[#141210] mb-0.5">Connect an inbox to verify these</p>
            <p className="text-[12.5px] text-[#8A8078] leading-relaxed">
              Bonza can only check programmes that email you a statement. Your entered balances stay as they are.
            </p>
          </div>
          {configurable && (
            <button
              onClick={async () => {
                try {
                  window.location.href = await startLoyaltyOAuth(configurable, "settings");
                } catch {
                  setConfigurable(null);
                }
              }}
              className="text-[12.5px] font-semibold px-3.5 py-2 rounded-lg bg-bonza text-white hover:bg-bonza-dark flex-shrink-0"
            >
              Connect
            </button>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(20,18,16,0.04)] divide-y divide-[#F4F1EC]">
          {rows.map((r) => (
            <ReviewRow key={r.id} r={r} onChanged={onChanged} />
          ))}
        </div>
      )}
    </section>
  );
});

function ReviewRow({ r, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(r.balance));
  const [busy, setBusy] = useState(false);
  const pill = PILL[r.state] || PILL.not_checked;

  const save = async () => {
    setBusy(true);
    try {
      await setManualBalance(r.id, Number(value || 0));
      setEditing(false);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await deleteDuplicate(r.id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };
  const removeRow = async () => {
    setBusy(true);
    try {
      await removeAccount(r.id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3.5 px-[18px] py-[15px]">
      <ProgrammeLogo programme={r} size={42} radius={12} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold tracking-[-0.2px] truncate" style={{ color: r.brandColor || "#141210" }}>
          {r.displayName}
        </p>
        <p className="text-[12.5px] text-[#8A8078] truncate">
          {r.state !== "not_checked" && r.statementDate ? `Statement ${fmtDate(r.statementDate)}` : "No statement found"}
          {r.state === "updated" && r.previousBalance != null ? ` · was ${r.previousBalance.toLocaleString()}` : ""}
          {r.state === "verified" ? " · matched your entry" : ""}
          {r.statementSource && r.state !== "not_checked" ? ` · ${r.statementSource}` : ""}
        </p>
      </div>

      {editing ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
            onKeyDown={(e) => (e.key === "Enter" ? save() : e.key === "Escape" ? setEditing(false) : null)}
            inputMode="numeric"
            className="w-[110px] rounded-lg border border-ink-900/[0.18] bg-white px-2.5 py-1.5 text-[14px] text-ink-900 tabular-nums text-right focus:outline-none focus:border-bonza"
          />
          <button onClick={save} disabled={busy} className="text-[12px] font-semibold text-white bg-bonza px-3 py-1.5 rounded-lg disabled:opacity-50">
            Save
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 flex-shrink-0 tabular-nums">
          <div className="text-right">
            <p className="text-[16px] font-bold text-[#141210]">
              {r.balance.toLocaleString()} <span className="text-[12px] font-medium text-[#A69C92]">{r.currency}</span>
            </p>
          </div>
          {r.manualOverride ? (
            <span className="text-[12px] font-semibold px-[9px] py-[3px] rounded-full bg-[#F4F1EC] text-[#7A6A58]">Edited</span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[12px] font-semibold px-[9px] py-[3px] rounded-full"
              style={{ background: pill.bg, color: pill.fg }}
            >
              <PillIcon kind={pill.icon} /> {pill.label}
            </span>
          )}
          {r.state === "duplicate" ? (
            <button onClick={remove} disabled={busy} title="Remove duplicate" className="text-[#A69C92] hover:text-[#9A6B13] p-1">
              <TrashGlyph />
            </button>
          ) : r.state === "not_checked" ? (
            <div className="flex items-center gap-0.5">
              <button onClick={() => setEditing(true)} title="Edit balance" className="text-[#A69C92] hover:text-ink-900 p-1">
                <PencilGlyph />
              </button>
              <button onClick={removeRow} disabled={busy} title="Remove this balance" className="text-[#A69C92] hover:text-[#9A6B13] p-1 disabled:opacity-50">
                <TrashGlyph />
              </button>
            </div>
          ) : (
            <span className="w-[26px]" />
          )}
        </div>
      )}
    </div>
  );
}

// ── inline glyphs (no icon dep, no emoji) ──
const G = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
function PillIcon({ kind }) {
  if (kind === "check")
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" {...G}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  if (kind === "refresh")
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" {...G}>
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <polyline points="21 3 21 9 15 9" />
      </svg>
    );
  if (kind === "copy")
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" {...G}>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
    );
  return <MailOffGlyph />;
}
const MailOffGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" {...G}>
    <path d="M3 8l9 6 9-6M3 8v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8" />
    <path d="M2 2l20 20" />
  </svg>
);
const PencilGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...G}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const TrashGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...G}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
);
const LockGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" {...G}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
