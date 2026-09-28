// pages/PointsConnectingPage.jsx — "Gathering your points" loading screen. Reached after connecting an
// inbox (OAuth callback) or from the /points Sync button. Runs the deep sync one programme at a time with
// live progress, and only lets the user continue once the parse is complete.
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { deepSyncStart, deepSyncStep, deepSyncFinish } from "../utils/api";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function PointsConnectingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = params.get("from");
  const provider = params.get("provider") || undefined;

  const [percent, setPercent] = useState(0);
  const [status, setStatus] = useState("Connecting to your inbox…");
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // guard StrictMode double-invoke
    startedRef.current = true;
    (async () => {
      try {
        const { runId, programmes, total } = await deepSyncStart(provider);
        const n = total || programmes.length || 1;
        for (let i = 0; i < programmes.length; i++) {
          setStatus(`Scanning ${programmes[i].displayName}…`);
          setPercent(Math.round((i / n) * 90));
          await deepSyncStep(runId, programmes[i].programme).catch(() => {});
          await delay(380); // keep progress legible (real steps take longer than the mock)
        }
        setStatus("Finishing up…");
        setPercent(95);
        await deepSyncFinish(runId).catch(() => {});
        setPercent(100);
        setStatus("Done — your points are up to date");
        setDone(true);
      } catch {
        setFailed(true);
        setStatus("We couldn't finish the sync");
        setPercent(100);
        setDone(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onContinue = () => navigate(from === "onboarding" ? "/onboarding" : "/points/review");

  return (
    <div className="min-h-screen bg-[#F7F5F1] flex items-center justify-center px-8">
      <div className="w-full max-w-[640px]">
        <h1 className="text-[40px] font-bold text-ink-900 tracking-[-1px] mb-7">Gathering your points</h1>

        <p className="text-[15px] font-semibold text-ink-900 mb-2.5">
          {percent}% — {status}
        </p>
        <div className="h-2.5 w-full rounded-full bg-ink-900/[0.08] overflow-hidden mb-7">
          <div
            className="h-full rounded-full bg-bonza transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-[15px] text-ink-600 leading-[1.6] mb-4">
          We're reading your loyalty statement emails to gather your balances so you don't have to enter them
          by hand. You'll then see exactly what we found and can correct anything.
        </p>
        <p className="text-[15px] text-ink-600 leading-[1.6] mb-9">
          Bonza reads statement emails only — it never stores your loyalty passwords.
        </p>

        <button
          onClick={onContinue}
          disabled={!done}
          className={`inline-flex items-center gap-2 text-[15px] font-semibold px-7 py-3.5 rounded-full transition-colors ${
            done ? "bg-bonza text-white hover:bg-bonza-dark" : "bg-bonza/25 text-white/80 cursor-not-allowed"
          }`}
        >
          Continue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>

        {failed && (
          <p className="mt-4 text-[12.5px] text-ink-300">
            Some balances may not have updated. You can add or edit them manually on the Points page.
          </p>
        )}
      </div>
    </div>
  );
}
