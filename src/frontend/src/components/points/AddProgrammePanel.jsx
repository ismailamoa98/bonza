// components/points/AddProgrammePanel.jsx — right-side slide-in for adding a loyalty programme.
// Two steps: form → confirm. Verification is routed per programme (catalog `verifyMethod`):
//   "email"  → hotels + major airlines whose statements email a balance → offer "Verify with email"
//              (real only when an inbox is genuinely connected; never fabricates offline).
//   "manual" → banks/cards + long-tail → no verify button, balance is self-reported.
// The self-reported path upserts via POST /loyalty/accounts; the email path upserts via the real sync.
import { useEffect, useState } from "react";
import { useAppStore } from "../../store/appStore";
import {
  addLoyaltyAccount,
  apiErrorMessage,
  getLoyaltyProviders,
  syncLoyaltyNow,
  startLoyaltyOAuth,
} from "../../utils/api";
import { PROGRAMMES } from "../../data/programmes";
import { formatUpdatedAt } from "../../utils/format";
import ProgrammeSelect from "./ProgrammeSelect";
import { XIcon, CheckIcon, InfoIcon } from "./icons";

const PROVIDER_LABEL = { gmail: "Gmail", outlook: "Outlook" };

const fmtGbp = (n) =>
  `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AddProgrammePanel({ open, onClose, onAdded, catalog, editAccount, accounts = [] }) {
  const user = useAppStore((s) => s.user);
  const [shown, setShown] = useState(false);
  const isEdit = Boolean(editAccount);

  // Prefer the live backend catalog (all point-earning programmes, with brand colours + rates); fall
  // back to the static list (no rate, so the confirm step hides the £ value).
  const items =
    catalog && catalog.length
      ? catalog
      : PROGRAMMES.map((p) => ({ programme: p.key, displayName: p.label, category: "card", brandColor: "#9a9088" }));
  const firstProgramme =
    items.find((i) => i.category === "card")?.programme || items[0]?.programme || PROGRAMMES[0].key;

  const [step, setStep] = useState("form"); // "form" | "confirm"
  const [programme, setProgramme] = useState(firstProgramme);
  const [number, setNumber] = useState("");
  const [points, setPoints] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Verify-with-email state.
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // { found, balance?, provider, mock }
  const [connectProvider, setConnectProvider] = useState(null); // provider configured but not connected

  const close = () => {
    setShown(false);
    setTimeout(() => onClose?.(), 250);
  };

  // Slide-in + reset on open; Escape closes.
  useEffect(() => {
    if (!open) return undefined;
    setShown(false);
    if (editAccount) {
      // Edit an existing programme: pre-fill its recorded details and open straight on the confirm step.
      setStep("confirm");
      setProgramme(editAccount.programme);
      setNumber(editAccount.accountNumber || "");
      setPoints(String(editAccount.balance ?? ""));
      setEmail(editAccount.loyaltyEmailAddress || "");
    } else {
      setStep("form");
      setProgramme(firstProgramme);
      setNumber("");
      setPoints("");
      setEmail("");
    }
    setError(null);
    setVerifying(false);
    setVerifyResult(null);
    setConnectProvider(null);
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const selected = items.find((i) => i.programme === programme) || {};
  const cpp = selected.centsPerPoint || 0;
  const typedPoints = Number(points || 0);
  const typedValue = cpp ? (typedPoints * cpp) / 100 : null;
  // Only programmes flagged email-verifiable (hotels + major airlines) offer "Verify with email".
  const canEmailVerify = (selected.verifyMethod || "manual") === "email";

  // Current balance already on file for this programme (for the before → after validation).
  const existingAccount = editAccount || accounts.find((a) => a.programme === programme) || null;
  const existingBalance =
    existingAccount && existingAccount.balance != null ? Number(existingAccount.balance) : null;
  const delta = existingBalance != null ? typedPoints - existingBalance : null;
  const lastUpdated = existingAccount ? formatUpdatedAt(existingAccount.lastSynced, { withTime: true }) : null;

  const goConfirm = () => {
    setError(null);
    setVerifyResult(null);
    setConnectProvider(null);
    setStep("confirm");
  };

  const commitTyped = async () => {
    setSaving(true);
    setError(null);
    try {
      await addLoyaltyAccount({
        programme,
        balance: typedPoints,
        accountNumber: number.trim() || null,
        loyaltyEmailAddress: email.trim() || null,
      });
      onAdded?.();
      close();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // A verified sync already upserted the LoyaltyAccount rows, so "Done" just reloads + closes.
  const done = () => {
    onAdded?.();
    close();
  };

  const runVerify = async () => {
    setVerifying(true);
    setError(null);
    setVerifyResult(null);
    setConnectProvider(null);
    try {
      const providers = await getLoyaltyProviders();
      const order = ["gmail", "outlook"];
      const connected = order.find((p) => providers[p]?.connected);
      const configurable = order.find((p) => providers[p]?.configured && !providers[p]?.connected);

      if (connected) {
        // Only a genuinely connected inbox does anything real — a live parse (syncMethod: email_parse).
        const result = await syncLoyaltyNow(connected);
        const list = result?.accounts || result?.updatedAccounts || [];
        const match = list.find((a) => a.programme === programme);
        setVerifyResult(
          match ? { found: true, balance: match.balance, provider: connected } : { found: false, provider: connected }
        );
      } else if (configurable) {
        // Real OAuth available but not connected yet → offer the connect handoff.
        setConnectProvider(configurable);
      } else {
        // No inbox connected (offline/dev default): be honest — never run the mock, never fabricate a
        // balance, write nothing. The user connects email or self-reports.
        setVerifyResult({ unavailable: true });
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  const connect = async () => {
    setError(null);
    try {
      const url = await startLoyaltyOAuth(connectProvider, "settings");
      window.location.href = url;
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  // Edit mode opens on confirm with a fixed programme — no form step, so no Back.
  const headerAction = isEdit ? (
    <span className="w-[52px]" aria-hidden="true" />
  ) : step === "form" ? (
    <button
      onClick={goConfirm}
      className="px-4 py-2 rounded-lg bg-bonza text-white text-[13px] font-semibold hover:bg-bonza-dark"
    >
      Review
    </button>
  ) : (
    <button
      onClick={() => setStep("form")}
      className="px-4 py-2 rounded-lg bg-white shadow text-ink-600 text-[13px] font-semibold hover:text-ink-900"
    >
      Back
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="flex-1 bg-black/40" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add programme"
        className={`w-full max-w-[480px] bg-[#F7F5F1] h-full shadow-2xl flex flex-col font-jakarta transform transition-transform duration-300 ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header: close · title · action */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-5 border-b border-ink-900/[0.08]">
          <button
            onClick={close}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-ink-600 hover:text-ink-900"
          >
            <XIcon width="16" height="16" />
          </button>
          <h2 className="text-[17px] font-bold text-ink-900 tracking-[-0.3px]">
            {isEdit ? "Edit balance" : step === "form" ? "Add programme" : "Confirm"}
          </h2>
          {headerAction}
        </div>

        {step === "form" ? (
          /* ── Form ── */
          <div className="flex-1 overflow-y-auto px-6 py-7 space-y-6">
            <Field label="Loyalty program">
              <ProgrammeSelect value={programme} onChange={setProgramme} items={items} />
            </Field>

            <Field label="Number">
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full rounded-xl border border-ink-900/[0.14] bg-white px-3.5 py-3 text-[14px] text-ink-900 focus:outline-none focus:border-bonza"
              />
            </Field>

            <Field label="Points">
              <input
                value={points}
                onChange={(e) => setPoints(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="0"
                className="w-full rounded-xl border border-ink-900/[0.14] bg-white px-3.5 py-3 text-[14px] text-ink-900 tabular-nums placeholder:text-ink-300 focus:outline-none focus:border-bonza"
              />
            </Field>

            <Field label="Membership email">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={user?.email || ""}
                className="w-full rounded-xl border border-ink-900/[0.14] bg-white px-3.5 py-3 text-[14px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-bonza"
              />
              <p className="mt-2 text-[12px] text-ink-300 leading-relaxed">
                The email this membership is registered under.
                {user?.email ? ` Leave blank to use ${user.email}.` : ""}
              </p>
            </Field>
          </div>
        ) : (
          /* ── Confirm ── */
          <div className="flex-1 overflow-y-auto px-6 py-7 space-y-5">
            {/* Editable summary — points is the priority field; email + number are the recorded details */}
            <div className="rounded-2xl bg-white shadow-sm border border-ink-900/[0.06] p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: selected.brandColor || "#9a9088" }} />
                <p className="text-[15px] font-bold text-ink-900">{selected.displayName || programme}</p>
                {lastUpdated && (
                  <span className="ml-auto text-[11px] text-ink-300">Last updated {lastUpdated}</span>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-300 mb-1.5">Points</p>
                <input
                  value={points}
                  onChange={(e) => setPoints(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="0"
                  autoFocus={isEdit}
                  className="w-full rounded-xl border border-ink-900/[0.14] bg-white px-3.5 py-3 text-[18px] font-bold text-ink-900 tabular-nums placeholder:text-ink-300 focus:outline-none focus:border-bonza"
                />
              </div>

              {existingBalance != null && (
                <Row label="Change">
                  <span className="tabular-nums font-semibold text-ink-900">
                    {existingBalance.toLocaleString()} <span className="text-ink-300">→</span>{" "}
                    {typedPoints.toLocaleString()}
                    {delta !== 0 && (
                      <span className={`ml-1.5 ${delta > 0 ? "text-[#186334]" : "text-bonza-dark"}`}>
                        ({delta > 0 ? "+" : "−"}
                        {Math.abs(delta).toLocaleString()})
                      </span>
                    )}
                  </span>
                </Row>
              )}

              {typedValue !== null && (
                <Row label="Estimated value">
                  <span className="tabular-nums font-semibold text-ink-900">{fmtGbp(typedValue)}</span>
                </Row>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-300 mb-1.5">Membership email</p>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={user?.email || ""}
                  className="w-full rounded-xl border border-ink-900/[0.14] bg-white px-3.5 py-2.5 text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-bonza"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-300 mb-1.5">Membership number</p>
                <input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="—"
                  className="w-full rounded-xl border border-ink-900/[0.14] bg-white px-3.5 py-2.5 text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-bonza"
                />
              </div>
            </div>

            {/* Verify result / connect prompt */}
            {connectProvider ? (
              <div className="rounded-xl bg-white border border-ink-900/[0.08] p-4">
                <p className="text-[13px] text-ink-900 font-semibold mb-1">
                  Connect {PROVIDER_LABEL[connectProvider]} to verify
                </p>
                <p className="text-[12.5px] text-ink-600 leading-relaxed mb-3">
                  We'll read your loyalty statement emails to pull the real balance. You'll come back here
                  afterwards to finish adding.
                </p>
                <button
                  onClick={connect}
                  className="px-4 py-2 rounded-lg bg-bonza text-white text-[13px] font-semibold hover:bg-bonza-dark"
                >
                  Connect {PROVIDER_LABEL[connectProvider]}
                </button>
              </div>
            ) : verifyResult?.found ? (
              <div className="rounded-xl bg-[#E4F0E7] border border-[#186334]/20 p-4">
                <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#186334] mb-1">
                  <CheckIcon width="14" height="14" /> Verified balance
                </p>
                <p className="text-[13px] text-ink-900 leading-relaxed">
                  Found <span className="font-bold tabular-nums">{verifyResult.balance.toLocaleString()}</span> pts
                  {cpp ? ` (${fmtGbp((verifyResult.balance * cpp) / 100)})` : ""} in your{" "}
                  {PROVIDER_LABEL[verifyResult.provider]} inbox. This is saved and used instead of your typed
                  balance.
                </p>
              </div>
            ) : verifyResult?.unavailable ? (
              <div className="rounded-xl bg-white border border-ink-900/[0.08] p-4">
                <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-900 mb-1">
                  <InfoIcon width="14" height="14" /> Email verification isn't set up
                </p>
                <p className="text-[12.5px] text-ink-600 leading-relaxed">
                  Connect Gmail or Outlook to pull your real {selected.displayName || programme} balance from your
                  statement emails. For now, add your balance manually below.
                </p>
              </div>
            ) : verifyResult && !verifyResult.found ? (
              <div className="rounded-xl bg-white border border-ink-900/[0.08] p-4">
                <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-900 mb-1">
                  <InfoIcon width="14" height="14" /> No balance found
                </p>
                <p className="text-[12.5px] text-ink-600 leading-relaxed">
                  We couldn't find a {selected.displayName || programme} balance in your{" "}
                  {PROVIDER_LABEL[verifyResult.provider]} inbox. You can still add your typed balance as
                  self-reported.
                </p>
              </div>
            ) : canEmailVerify ? (
              <p className="text-[12.5px] text-ink-600 leading-relaxed px-1">
                Add the balance you typed as <span className="font-semibold">self-reported</span>, or verify it
                against your inbox first — the verified balance becomes the source of truth.
              </p>
            ) : null}

            {error && <p className="text-[12.5px] text-red-600 px-1">{error}</p>}

            {/* Actions */}
            <div className="space-y-2.5 pt-1">
              {verifyResult?.found ? (
                <>
                  <PrimaryButton onClick={done}>Done</PrimaryButton>
                  <SecondaryButton onClick={commitTyped} disabled={saving || !typedPoints}>
                    {saving ? "Adding…" : `Add my typed ${typedPoints ? typedPoints.toLocaleString() : ""} instead`}
                  </SecondaryButton>
                </>
              ) : (
                (() => {
                  // Show the Verify button only for email-verifiable programmes, before any terminal
                  // verify state, and outside the connect handoff. When it's shown, Add is the secondary
                  // action; otherwise (manual programme, unavailable, not-found, connecting) Add is primary.
                  const showVerify = canEmailVerify && !connectProvider && !verifyResult;
                  const AddButton = showVerify ? SecondaryButton : PrimaryButton;
                  return (
                    <>
                      {showVerify && (
                        <PrimaryButton onClick={runVerify} disabled={verifying}>
                          {verifying ? "Checking your inbox…" : "Verify with email"}
                        </PrimaryButton>
                      )}
                      <AddButton onClick={commitTyped} disabled={saving || !typedPoints}>
                        {saving
                          ? "Saving…"
                          : isEdit
                            ? "Save changes"
                            : `Add ${typedPoints ? typedPoints.toLocaleString() + " " : ""}(self-reported)`}
                      </AddButton>
                      {!typedPoints && (
                        <p className="text-[11.5px] text-ink-300 text-center">Enter a balance to save it.</p>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-300 mb-2">{label}</p>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[13px]">
      <span className="text-ink-600">{label}</span>
      {children}
    </div>
  );
}

function PrimaryButton({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-4 py-3 rounded-xl bg-bonza text-white text-[13.5px] font-semibold hover:bg-bonza-dark disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-4 py-3 rounded-xl bg-white shadow-sm border border-ink-900/[0.1] text-ink-900 text-[13.5px] font-semibold hover:bg-ink-900/[0.03] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
