// components/points/AddProgrammePanel.jsx — right-side slide-in for adding/editing a loyalty programme.
// Two steps: form → confirm. The confirm step captures the balance (+ email/number/expiry) and saves via
// POST /loyalty/accounts. Verification no longer happens here: saving an email-eligible programme
// (verifyMethod "email" — hotels + major airlines) routes to the Balance-review page, which checks it
// against the user's inbox; bank/card ("manual") programmes just save as self-reported.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/appStore";
import { addLoyaltyAccount, apiErrorMessage } from "../../utils/api";
import { PROGRAMMES } from "../../data/programmes";
import { formatUpdatedAt } from "../../utils/format";
import ProgrammeSelect from "./ProgrammeSelect";
import ProgrammeLogo from "../common/ProgrammeLogo";
import { XIcon } from "./icons";

export default function AddProgrammePanel({ open, onClose, onAdded, catalog, editAccount, accounts = [] }) {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const [shown, setShown] = useState(false);
  const isEdit = Boolean(editAccount);

  // Prefer the live backend catalog (all point-earning programmes, with brand colours + verifyMethod);
  // fall back to the static list.
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
  const [expireAt, setExpireAt] = useState(""); // optional YYYY-MM-DD points-expiry date
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const close = () => {
    setShown(false);
    setTimeout(() => onClose?.(), 250);
  };

  // Slide-in + reset on open; Escape closes.
  useEffect(() => {
    if (!open) return undefined;
    setShown(false);
    if (editAccount) {
      // Edit an existing membership: pre-fill its recorded details and open straight on the confirm step.
      setStep("confirm");
      setProgramme(editAccount.programme);
      setNumber(editAccount.accountNumber || "");
      setPoints(String(editAccount.balance ?? ""));
      setEmail(editAccount.loyaltyEmailAddress || "");
      setExpireAt(editAccount.expiresAt ? String(editAccount.expiresAt).slice(0, 10) : "");
    } else {
      setStep("form");
      setProgramme(firstProgramme);
      setNumber("");
      setPoints("");
      setEmail("");
      setExpireAt("");
    }
    setError(null);
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
  const typedPoints = Number(points || 0);
  // Email-eligible programmes (hotels + major airlines) route to the review page to be verified.
  const canEmailVerify = (selected.verifyMethod || "manual") === "email";

  // The membership this add/edit resolves to: the edited row, else an existing account for the same
  // programme AND membership number (number = identity — a new number is a separate membership).
  const numberKey = number.trim();
  const existingAccount =
    editAccount ||
    accounts.find((a) => a.programme === programme && (a.accountNumber || "") === numberKey) ||
    null;
  const existingBalance =
    existingAccount && existingAccount.balance != null ? Number(existingAccount.balance) : null;
  const delta = existingBalance != null ? typedPoints - existingBalance : null;
  const lastUpdated = existingAccount ? formatUpdatedAt(existingAccount.lastSynced, { withTime: true }) : null;
  // Adding a fresh membership number to a programme the user already holds → a second membership.
  const sameProgramme = accounts.filter((a) => a.programme === programme);
  const isNewMembership = !isEdit && !existingAccount && sameProgramme.length > 0;
  const existingLabel =
    sameProgramme.length === 1
      ? sameProgramme[0].accountNumber
        ? `one (number ${sameProgramme[0].accountNumber})`
        : "one"
      : `${sameProgramme.length} memberships`;

  const commitTyped = async () => {
    setSaving(true);
    setError(null);
    try {
      await addLoyaltyAccount({
        accountId: editAccount?.id, // edit updates this exact membership; add resolves by number
        programme,
        balance: typedPoints,
        accountNumber: number.trim() || null,
        loyaltyEmailAddress: email.trim() || null,
        pointsExpireAt: expireAt || null,
      });
      // Email-eligible → review page verifies it against the inbox; otherwise just refresh + close.
      if (canEmailVerify) {
        navigate(`/points/review?updated=${encodeURIComponent(programme)}`);
      } else {
        onAdded?.();
        close();
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = saving
    ? "Saving…"
    : canEmailVerify
      ? "Save & verify"
      : isEdit
        ? "Save changes"
        : `Save ${typedPoints ? typedPoints.toLocaleString() + " " : ""}(self-reported)`;

  // Edit mode opens on confirm with a fixed programme — no form step, so no Back.
  const headerAction = isEdit ? (
    <span className="w-[52px]" aria-hidden="true" />
  ) : step === "form" ? (
    <button
      onClick={() => {
        setError(null);
        setStep("confirm");
      }}
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
                <ProgrammeLogo programme={selected} size={36} radius={11} />
                <p className="text-[15px] font-bold" style={{ color: selected.brandColor || "#2a2420" }}>
                  {selected.displayName || programme}
                </p>
                {lastUpdated && (
                  <span className="ml-auto text-[11px] text-ink-300">Last updated {lastUpdated}</span>
                )}
              </div>

              {isNewMembership && (
                <p className="text-[12px] text-ink-600 bg-bonza/[0.07] rounded-lg px-3 py-2 leading-relaxed">
                  This will be saved as a <span className="font-semibold">separate</span>{" "}
                  {selected.displayName || programme} membership — you already have {existingLabel} on file. To
                  update that one instead, enter its number.
                </p>
              )}

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
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-300 mb-1.5">
                  Points expire <span className="font-medium normal-case tracking-normal text-ink-300/80">(optional)</span>
                </p>
                <input
                  type="date"
                  value={expireAt}
                  onChange={(e) => setExpireAt(e.target.value)}
                  className="w-full rounded-xl border border-ink-900/[0.14] bg-white px-3.5 py-2.5 text-[13.5px] text-ink-900 focus:outline-none focus:border-bonza"
                />
                <p className="mt-1.5 text-[11.5px] text-ink-300 leading-relaxed">
                  We'll warn you (and email you) as the date approaches. Leave blank if they don't expire.
                </p>
              </div>
            </div>

            {canEmailVerify && (
              <p className="text-[12.5px] text-ink-600 leading-relaxed px-1">
                {selected.displayName || programme} statements list a balance, so after saving we'll check it
                against your inbox on the next screen.
              </p>
            )}

            {error && <p className="text-[12.5px] text-red-600 px-1">{error}</p>}

            {/* Action */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={commitTyped}
                disabled={saving || !typedPoints}
                className="w-full px-4 py-3 rounded-xl bg-bonza text-white text-[13.5px] font-semibold hover:bg-bonza-dark disabled:opacity-50"
              >
                {saveLabel}
              </button>
              {!typedPoints && (
                <p className="text-[11.5px] text-ink-300 text-center">Enter a balance to save it.</p>
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
