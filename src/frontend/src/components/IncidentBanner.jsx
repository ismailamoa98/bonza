// components/IncidentBanner.jsx — Phase 22 §22h. App-wide dismissible strip when a service is degraded/outage.
// Terra for degraded, deeper for outage. Dismissal persists for that incident only, keyed on the status updatedAt.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStatus } from "../utils/api";

const KEY = "bonza_incident_dismissed";

export default function IncidentBanner() {
  const [data, setData] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let live = true;
    getStatus().then((d) => live && setData(d)).catch(() => {});
    const t = setInterval(() => getStatus().then((d) => live && setData(d)).catch(() => {}), 60000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  const incidentKey = data?.updatedAt ? String(data.updatedAt) : null;
  useEffect(() => {
    if (!incidentKey) return;
    try {
      setDismissed(localStorage.getItem(KEY) === incidentKey);
    } catch {
      setDismissed(false);
    }
  }, [incidentKey]);

  if (!data?.incident || dismissed) return null;

  const affected = data.services.filter((s) => s.state === "degraded" || s.state === "outage");
  const worst = affected.some((s) => s.state === "outage") ? "outage" : "degraded";
  const msg = affected[0]?.message || `${affected.map((s) => s.displayName).join(", ")} ${affected.length > 1 ? "are" : "is"} affected.`;

  const dismiss = () => {
    try {
      if (incidentKey) localStorage.setItem(KEY, incidentKey);
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className={`relative z-40 px-4 py-2 text-center text-[13px] font-medium text-white ${worst === "outage" ? "bg-[#9e2e22]" : "bg-bonza-dark"}`}>
      <span>{msg} </span>
      <Link to="/status" className="font-semibold underline">Status →</Link>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
