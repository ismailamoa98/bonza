// pages/Settings.jsx — Profile / Loyalty / Notifications / Pro tabs.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AirportDropdown from "../components/AirportDropdown";
import { PROGRAMMES, programmeLabel } from "../data/programmes";
import { useAppStore } from "../store/appStore";
import { formatGbp, shortDate } from "../utils/format";
import {
  updateProfile,
  getLoyaltyAccounts,
  getLoyaltyProviders,
  startLoyaltyOAuth,
  syncLoyalty,
  syncLoyaltyNow,
  disconnectLoyalty,
  addLoyaltyAccount,
  removeLoyaltyAccount,
  getNotificationPreferences,
  updateNotificationPreferences,
  getSubscriptionStatus,
  startProCheckout,
  cancelSubscription,
  apiErrorMessage,
} from "../utils/api";

const TABS = ["Profile", "Loyalty", "Notifications", "Pro"];
const TRAVEL_STYLES = [
  ["points_maximiser", "Points maximiser"],
  ["comfort_status", "Comfort & status"],
  ["budget_explorer", "Budget explorer"],
  ["family_trips", "Family trips"],
];

export default function Settings() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get("synced") || params.get("loyaltyError") ? "Loyalty" : "Profile");
  const banner = params.get("loyaltyError")
    ? { kind: "error", text: `Couldn't connect: ${params.get("loyaltyError").replace(/_/g, " ")}` }
    : params.get("synced")
      ? { kind: "ok", text: `Loyalty connected — ${params.get("synced")} account(s) synced.` }
      : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 font-jakarta text-ink">
      <h1 className="font-display text-[28px] font-semibold tracking-[-0.01em]">Settings</h1>

      {banner && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-[13px] font-medium ${banner.kind === "error" ? "border border-bonza/30 bg-bonza-50 text-bonza-dark" : "border border-[#bfe3cb] bg-[#EAF6EE] text-[#1E7E40]"}`}>
          {banner.text}
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-[#e7e1d8]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-[13px] font-semibold transition-colors ${tab === t ? "border-bonza text-bonza" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Profile" && <ProfileTab />}
        {tab === "Loyalty" && <LoyaltyTab />}
        {tab === "Notifications" && <NotificationsTab />}
        {tab === "Pro" && <ProTab />}
      </div>
    </div>
  );
}

function Card({ children }) {
  return <div className="rounded-2xl border border-[rgba(40,30,20,0.06)] bg-white p-6">{children}</div>;
}

function ProfileTab() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const [home, setHome] = useState(profile?.homeAirport ? { code: profile.homeAirport } : null);
  const [style, setStyle] = useState(profile?.travelStyle || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const patch = {};
      if (home?.code) patch.homeAirport = home.code;
      if (style) patch.travelStyle = style;
      const updated = await updateProfile(patch);
      setProfile(updated);
      setMsg({ ok: true, text: "Saved." });
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
        Home airport {profile?.homeAirport && <span className="text-ink-soft">(currently {profile.homeAirport})</span>}
      </label>
      <AirportDropdown
        label=""
        placeholder="Search your home airport"
        displayLabel={home?.label || profile?.homeAirport || ""}
        onSelect={(a) => setHome({ code: a.code, label: `${a.code} — ${a.city || a.name}` })}
      />

      <label className="mb-1 mt-5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">Travel style</label>
      <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full rounded-lg border border-[#e0d9cf] bg-white px-3 py-2 text-[13px]">
        <option value="">Not set</option>
        {TRAVEL_STYLES.map(([id, label]) => (
          <option key={id} value={id}>{label}</option>
        ))}
      </select>

      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-bonza px-6 py-2 text-[13px] font-semibold text-white hover:bg-bonza-dark disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
        {msg && <span className={`text-[12px] font-medium ${msg.ok ? "text-[#1E7E40]" : "text-bonza-dark"}`}>{msg.text}</span>}
      </div>
    </Card>
  );
}

function LoyaltyTab() {
  const accounts = useAppStore((s) => s.loyaltyAccounts);
  const setLoyaltyAccounts = useAppStore((s) => s.setLoyaltyAccounts);
  const [providers, setProviders] = useState({ gmail: {}, outlook: {} });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refresh = async () => setLoyaltyAccounts(await getLoyaltyAccounts());
  useEffect(() => {
    getLoyaltyProviders().then(setProviders).catch(() => {});
  }, []);

  const guard = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const connect = (provider) =>
    guard(async () => {
      if (providers[provider]?.configured) {
        window.location.href = await startLoyaltyOAuth(provider, "settings");
        return;
      }
      await syncLoyalty(provider);
      await refresh();
    });

  const syncNow = (provider) => guard(async () => { await syncLoyaltyNow(provider); await refresh(); });
  const disconnect = (provider) =>
    guard(async () => {
      await disconnectLoyalty(provider);
      setProviders(await getLoyaltyProviders());
    });
  const remove = (programme) => guard(async () => { await removeLoyaltyAccount(programme); await refresh(); });

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-[13px] font-semibold text-ink">Connect an email account</p>
        <p className="mt-0.5 text-[12px] text-ink-soft">Bonza reads your loyalty statements to keep balances current.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {["gmail", "outlook"].map((p) => (
            <div key={p} className="rounded-xl border border-[rgba(40,30,20,0.1)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold capitalize text-ink">{p}</span>
                {providers[p]?.connected && <span className="text-[11px] font-bold text-[#1E7E40]">Connected</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {providers[p]?.connected ? (
                  <>
                    <button type="button" onClick={() => syncNow(p)} disabled={busy} className="rounded-lg border border-bonza px-3 py-1.5 text-[12px] font-semibold text-bonza hover:bg-bonza-50 disabled:opacity-50">Sync now</button>
                    <button type="button" onClick={() => disconnect(p)} disabled={busy} className="rounded-lg border border-[#e0d9cf] px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:text-ink disabled:opacity-50">Disconnect</button>
                  </>
                ) : (
                  <button type="button" onClick={() => connect(p)} disabled={busy} className="rounded-lg bg-bonza px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-bonza-dark disabled:opacity-50">
                    Connect {providers[p]?.configured ? "" : "(demo sync)"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <ManualAdd onAdded={refresh} onError={setError} />
        {error && <p className="mt-2 text-[12px] font-medium text-bonza-dark">{error}</p>}
      </Card>

      <Card>
        <p className="text-[13px] font-semibold text-ink">Connected accounts</p>
        {accounts.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-soft">No loyalty accounts yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#f0ece5]">
            {accounts.map((a) => (
              <li key={a.programme} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{programmeLabel(a.programme)}</p>
                  <p className="text-[11px] text-ink-muted tabular-nums">
                    {Number(a.balance).toLocaleString("en-GB")} pts · {formatGbp(a.valueGbp)}
                    {a.statusTier ? ` · ${a.statusTier}` : ""} · {a.syncMethod}
                    {a.lastSynced ? ` · ${shortDate(a.lastSynced)}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => remove(a.programme)} disabled={busy} className="shrink-0 text-[12px] font-semibold text-bonza-dark hover:underline disabled:opacity-50">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ManualAdd({ onAdded, onError }) {
  const [programme, setProgramme] = useState(PROGRAMMES[0].key);
  const [balance, setBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!balance) return;
    setSaving(true);
    onError(null);
    try {
      await addLoyaltyAccount({ programme, balance: Number(balance) });
      setBalance("");
      await onAdded();
    } catch (err) {
      onError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl bg-cream p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">Add a balance manually</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={programme} onChange={(e) => setProgramme(e.target.value)} className="rounded-lg border border-[#e0d9cf] bg-white px-3 py-2 text-[13px]">
          {PROGRAMMES.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <input value={balance} onChange={(e) => setBalance(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="Balance" className="w-28 rounded-lg border border-[#e0d9cf] bg-white px-3 py-2 text-[13px] tabular-nums" />
        <button type="button" onClick={add} disabled={saving || !balance} className="rounded-lg border border-bonza px-3 py-2 text-[13px] font-semibold text-bonza hover:bg-bonza-50 disabled:opacity-50">
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

const MARKETING_PREFS = [
  ["awardAlerts", "Award availability alerts"],
  ["expiryWarnings", "Points expiry warnings"],
  ["priceDropAlerts", "Price-drop alerts"],
  ["monthlySummary", "Monthly loyalty summary"],
];

function NotificationsTab() {
  const [prefs, setPrefs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getNotificationPreferences().then(setPrefs).catch((err) => setError(apiErrorMessage(err)));
  }, []);

  const toggle = async (key) => {
    const next = { ...(prefs || {}), [key]: !(prefs?.[key] ?? true) };
    setPrefs(next); // optimistic
    try {
      await updateNotificationPreferences({ [key]: next[key] });
    } catch (err) {
      setError(apiErrorMessage(err));
      setPrefs((p) => ({ ...p, [key]: !next[key] })); // revert
    }
  };

  return (
    <Card>
      <p className="text-[13px] font-semibold text-ink">Email notifications</p>
      <p className="mt-0.5 text-[12px] text-ink-soft">Choose which alerts Bonza sends you.</p>
      <div className="mt-4 space-y-1">
        {MARKETING_PREFS.map(([key, label]) => (
          <Toggle key={key} label={label} on={prefs ? prefs[key] !== false : true} onClick={() => toggle(key)} disabled={!prefs} />
        ))}
        <div className="mt-3 border-t border-[#f0ece5] pt-3">
          <Toggle label="Booking confirmations & account updates" on disabled note="Always on" />
        </div>
      </div>
      {error && <p className="mt-2 text-[12px] font-medium text-bonza-dark">{error}</p>}
    </Card>
  );
}

function Toggle({ label, on, onClick, disabled, note }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[13px] text-ink">{label}</span>
      {note ? (
        <span className="text-[11px] font-semibold text-ink-muted">{note}</span>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          role="switch"
          aria-checked={on}
          className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-bonza" : "bg-[#d9d2c8]"} disabled:opacity-60`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
      )}
    </div>
  );
}

function ProTab() {
  const creditBalance = useAppStore((s) => s.creditBalance);
  const setProStatus = useAppStore((s) => s.setProStatus);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = () => getSubscriptionStatus().then(setStatus).catch((err) => setError(apiErrorMessage(err)));
  useEffect(() => { load(); }, []);

  const upgrade = async () => {
    setBusy(true);
    try {
      const { checkoutUrl } = await startProCheckout();
      if (checkoutUrl) window.location.href = checkoutUrl;
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelSubscription();
      await load();
      setProStatus(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const isPro = status?.isPro;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-ink">Bonza {isPro ? "Pro" : "Free"}</p>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            {status
              ? isPro
                ? `${status.status === "cancelled" ? "Cancels" : "Renews"}${status.currentPeriodEnd ? ` ${shortDate(status.currentPeriodEnd)}` : ""}`
                : "Upgrade for full points optimisation, award search and 3% cashback."
              : "Loading…"}
          </p>
        </div>
        {status && (isPro ? (
          <button type="button" onClick={cancel} disabled={busy || status.status === "cancelled"} className="rounded-full border border-[#e0d9cf] px-5 py-2 text-[13px] font-semibold text-ink-soft hover:text-ink disabled:opacity-50">
            {status.status === "cancelled" ? "Cancelled" : busy ? "…" : "Cancel"}
          </button>
        ) : (
          <button type="button" onClick={upgrade} disabled={busy} className="rounded-full bg-bonza px-5 py-2 text-[13px] font-semibold text-white hover:bg-bonza-dark disabled:opacity-50">
            {busy ? "…" : "Upgrade — £49.99/yr"}
          </button>
        ))}
      </div>

      {creditBalance > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-cream px-4 py-3">
          <span className="text-[13px] text-ink-soft">Bonza Credits balance</span>
          <span className="text-[15px] font-bold text-bonza tabular-nums">{formatGbp(creditBalance)}</span>
        </div>
      )}
      {error && <p className="mt-2 text-[12px] font-medium text-bonza-dark">{error}</p>}
    </Card>
  );
}
