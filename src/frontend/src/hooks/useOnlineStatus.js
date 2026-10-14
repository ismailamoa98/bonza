// hooks/useOnlineStatus.js — Phase 24 §24i. Online/offline via navigator.onLine PLUS a 20s heartbeat to
// HEAD /api/v1/health, because navigator.onLine lies on captive portals. Fires EV.OFFLINE_DETECTED once per
// offline period, with duration_ms on recovery.
import { useEffect, useRef, useState } from "react";
import { track } from "../lib/analytics";
import { EV } from "../lib/analytics/events";

export function useOnlineStatus() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const offlineSince = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const goOffline = () => {
      if (offlineSince.current == null) offlineSince.current = Date.now();
      if (!cancelled) setOnline(false);
    };
    const goOnline = () => {
      if (offlineSince.current != null) {
        track(EV.OFFLINE_DETECTED, { duration_ms: Date.now() - offlineSince.current });
        offlineSince.current = null;
      }
      if (!cancelled) setOnline(true);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const ping = async () => {
      try {
        const res = await fetch(`/api/v1/health?t=${Date.now()}`, { method: "HEAD", cache: "no-store" });
        res.ok ? goOnline() : goOffline();
      } catch {
        goOffline();
      }
    };
    const id = setInterval(ping, 20000);

    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
