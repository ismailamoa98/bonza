// pages/StatusPage.jsx — Phase 22 §22h. Public service status — one source of truth when Duffel/Seats.aero is down.
import { useEffect, useState } from "react";
import { getStatus } from "../utils/api";
import { useHead } from "../utils/useHead";
import { canonicalUrl } from "../utils/siteUrl";

const DOT = { operational: "#1E7E40", degraded: "#da7756", outage: "#c0392b", maintenance: "#8A8078" };
const LABEL = { operational: "Operational", degraded: "Degraded", outage: "Outage", maintenance: "Maintenance" };

export default function StatusPage() {
  const [data, setData] = useState(null);
  useHead({
    title: "Service status | Bonza",
    description: "Live status of Bonza's services (flights, hotels, award search, payments, email sync) and any ongoing incidents.",
    canonical: canonicalUrl("/status"),
  });
  useEffect(() => {
    getStatus().then(setData).catch(() => setData({ services: [] }));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="font-display text-[30px] font-bold tracking-[-0.01em] text-ink">Service status</h1>
      <p className="mt-2 text-[14px] text-ink-soft">{data?.incident ? "Some services are affected — details below." : "All systems operational."}</p>

      <ul className="mt-6 divide-y divide-[#f0ebe3] rounded-2xl border border-[#e6e1d8] bg-white">
        {(data?.services || []).map((s) => (
          <li key={s.service} className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-[15px] font-semibold text-ink">{s.displayName}</p>
              {s.message && <p className="mt-0.5 text-[12.5px] text-ink-soft">{s.message}</p>}
            </div>
            <span className="flex flex-shrink-0 items-center gap-2 text-[13px] font-semibold" style={{ color: DOT[s.state] || "#8A8078" }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: DOT[s.state] || "#8A8078" }} />
              {LABEL[s.state] || s.state}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
