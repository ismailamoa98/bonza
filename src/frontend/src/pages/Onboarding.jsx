// pages/Onboarding.jsx — guided first-run: home airport, travel style, connect loyalty, poll recs.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AirportDropdown from "../components/AirportDropdown";
import { PROGRAMMES } from "../data/programmes";
import { useAppStore } from "../store/appStore";
import {
  updateProfile,
  getLoyaltyProviders,
  startLoyaltyOAuth,
  syncLoyalty,
  addLoyaltyAccount,
  getLoyaltyAccounts,
  getRecommendations,
  apiErrorMessage,
} from "../utils/api";

const TRAVEL_STYLES = [
  { id: "points_maximiser", label: "Points maximiser", desc: "Squeeze the most value from every point." },
  { id: "comfort_status", label: "Comfort & status", desc: "Premium cabins, lounges, elite perks." },
  { id: "budget_explorer", label: "Budget explorer", desc: "Lowest cash cost, go further for less." },
  { id: "family_trips", label: "Family trips", desc: "Simple, flexible, everyone travels together." },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const setProfile = useAppStore((s) => s.setProfile);
  const setLoyaltyAccounts = useAppStore((s) => s.setLoyaltyAccounts);
  const loyaltyAccounts = useAppStore((s) => s.loyaltyAccounts);

  const [step, setStep] = useState(1);
  const [home, setHome] = useState(null); // { code, label }
  const [travelStyle, setTravelStyle] = useState(null);
  const [providers, setProviders] = useState({ gmail: {}, outlook: {} });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLoyaltyProviders().then(setProviders).catch(() => {});
  }, []);

  const saveProfile = async (extra = {}) => {
    const patch = { onboardingComplete: true, ...extra };
    if (home?.code) patch.homeAirport = home.code;
    if (travelStyle) patch.travelStyle = travelStyle;
    const profile = await updateProfile(patch);
    setProfile(profile);
    return profile;
  };

  const skip = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveProfile();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  };

  const connect = async (provider) => {
    setError(null);
    try {
      if (providers[provider]?.configured) {
        const url = await startLoyaltyOAuth(provider, "onboarding");
        window.location.href = url;
        return;
      }
      setBusy(true);
      await syncLoyalty(provider);
      setLoyaltyAccounts(await getLoyaltyAccounts());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveProfile();
      setStep(4);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 font-jakarta text-ink">
      <div className="mb-6 flex items-center justify-between">
        <span className="font-display text-[22px] font-semibold tracking-[-0.01em]">Bonza</span>
        {step < 4 && (
          <button type="button" onClick={skip} disabled={busy} className="text-[13px] font-medium text-ink-muted hover:text-ink disabled:opacity-50">
            Skip for now
          </button>
        )}
      </div>

      {step < 4 && <Progress step={step} />}

      <div className="mt-6 rounded-2xl border border-[rgba(40,30,20,0.06)] bg-white p-6 sm:p-8">
        {step === 1 && (
          <Step title="Where do you usually fly from?" sub="Your home airport tailors every recommendation.">
            <AirportDropdown
              label="Home airport"
              placeholder="e.g. London Heathrow (LHR)"
              displayLabel={home?.label || ""}
              onSelect={(a) => setHome({ code: a.code, label: `${a.code} — ${a.city || a.name}` })}
            />
            <Nav onNext={() => setStep(2)} nextDisabled={!home} />
          </Step>
        )}

        {step === 2 && (
          <Step title="How do you like to travel?" sub="This shapes which options Bonza puts first.">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {TRAVEL_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setTravelStyle(s.id)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    travelStyle === s.id ? "border-bonza bg-bonza-50" : "border-[rgba(40,30,20,0.1)] hover:border-bonza/40"
                  }`}
                >
                  <p className="text-[14px] font-bold text-ink">{s.label}</p>
                  <p className="mt-0.5 text-[12px] text-ink-soft">{s.desc}</p>
                </button>
              ))}
            </div>
            <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!travelStyle} />
          </Step>
        )}

        {step === 3 && (
          <Step title="Connect your loyalty points" sub="Sync balances so Bonza can find your best redemptions. You can also add them manually.">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <ConnectButton label="Connect Gmail" provider="gmail" providers={providers} busy={busy} onClick={() => connect("gmail")} />
              <ConnectButton label="Connect Outlook" provider="outlook" providers={providers} busy={busy} onClick={() => connect("outlook")} />
            </div>
            <ManualAdd onAdded={async () => setLoyaltyAccounts(await getLoyaltyAccounts())} onError={setError} />
            {loyaltyAccounts.length > 0 && (
              <p className="mt-3 rounded-lg bg-[#EAF6EE] px-3 py-2 text-[12px] font-medium text-[#1E7E40]">
                {loyaltyAccounts.length} loyalty account{loyaltyAccounts.length === 1 ? "" : "s"} connected.
              </p>
            )}
            <Nav onBack={() => setStep(2)} onNext={finish} nextLabel="Finish" busy={busy} />
          </Step>
        )}

        {step === 4 && <Personalising navigate={navigate} />}

        {error && <p className="mt-3 text-[12px] font-medium text-bonza-dark">{error}</p>}
      </div>
    </div>
  );
}

function Progress({ step }) {
  const labels = ["Home airport", "Travel style", "Loyalty"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-1 items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${i + 1 <= step ? "bg-bonza text-white" : "bg-[#e7e1d8] text-ink-muted"}`}>
            {i + 1}
          </span>
          <span className={`text-[12px] font-medium ${i + 1 <= step ? "text-ink" : "text-ink-muted"}`}>{l}</span>
          {i < labels.length - 1 && <span className="ml-1 h-px flex-1 bg-[#e0d9cf]" />}
        </div>
      ))}
    </div>
  );
}

function Step({ title, sub, children }) {
  return (
    <div>
      <h1 className="font-display text-[24px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
      {sub && <p className="mt-1 text-[13px] text-ink-soft">{sub}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function Nav({ onBack, onNext, nextLabel = "Next", nextDisabled = false, busy = false }) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? (
        <button type="button" onClick={onBack} className="text-[13px] font-medium text-ink-soft hover:text-ink">
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || busy}
        className="rounded-full bg-bonza px-6 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-bonza-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Saving…" : nextLabel}
      </button>
    </div>
  );
}

function ConnectButton({ label, provider, providers, busy, onClick }) {
  const connected = providers[provider]?.connected;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || connected}
      className="flex items-center justify-center gap-2 rounded-xl border border-[rgba(40,30,20,0.12)] px-4 py-3 text-[13px] font-semibold text-ink transition-colors hover:border-bonza/50 hover:text-bonza disabled:opacity-60"
    >
      {connected ? `${label.replace("Connect ", "")} connected` : label}
    </button>
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
    <div className="rounded-xl bg-cream p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">Or add a balance manually</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={programme} onChange={(e) => setProgramme(e.target.value)} className="rounded-lg border border-[#e0d9cf] bg-white px-3 py-2 text-[13px]">
          {PROGRAMMES.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <input
          value={balance}
          onChange={(e) => setBalance(e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          placeholder="Balance"
          className="w-28 rounded-lg border border-[#e0d9cf] bg-white px-3 py-2 text-[13px] tabular-nums"
        />
        <button type="button" onClick={add} disabled={saving || !balance} className="rounded-lg border border-bonza px-3 py-2 text-[13px] font-semibold text-bonza hover:bg-bonza-50 disabled:opacity-50">
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

function Personalising({ navigate }) {
  const done = useRef(false);
  useEffect(() => {
    let cancelled = false;
    let timer;
    const start = Date.now();
    const go = () => {
      if (done.current) return;
      done.current = true;
      navigate("/dashboard", { replace: true });
    };
    const tick = async () => {
      try {
        const { status } = await getRecommendations();
        if (cancelled) return;
        if (status === "ready" || Date.now() - start > 120000) return go();
      } catch {
        if (Date.now() - start > 120000) return go();
      }
      if (!cancelled) timer = setTimeout(tick, 5000);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cream border-t-bonza" />
      <h1 className="font-display text-[22px] font-semibold text-ink">Personalising your packages…</h1>
      <p className="mt-1 text-[13px] text-ink-soft">Bonza is finding your best redemptions. This only takes a moment.</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-cream" />
        ))}
      </div>
    </div>
  );
}
