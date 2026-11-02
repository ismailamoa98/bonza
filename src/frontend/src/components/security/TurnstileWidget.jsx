// components/security/TurnstileWidget.jsx — Phase 27 §27d. Cloudflare Turnstile bot challenge. Driven by
// VITE_TURNSTILE_SITE_KEY: when it's absent (dev/offline) the widget renders NOTHING and reports the sentinel
// token "__disabled__" once, so the form it guards proceeds without friction. When a site key is set it lazy-
// loads the Turnstile script, renders the challenge, and reports the solved token (or "" on expiry/error).
import { useEffect, useRef } from "react";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
const DISABLED = "__disabled__";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export const turnstileEnabled = Boolean(SITE_KEY);
export const TURNSTILE_DISABLED = DISABLED;

// Load the Turnstile script once (shared across widget instances).
let scriptPromise = null;
function loadScript() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.turnstile);
    s.onerror = () => reject(new Error("turnstile script failed to load"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function TurnstileWidget({ onToken, action }) {
  const ref = useRef(null);
  const widgetId = useRef(null);

  useEffect(() => {
    // Disabled (no site key) — report the sentinel once so the guarded form isn't blocked.
    if (!SITE_KEY) {
      onToken?.(DISABLED);
      return undefined;
    }

    let cancelled = false;
    loadScript()
      .then((ts) => {
        if (cancelled || !ts || !ref.current) return;
        widgetId.current = ts.render(ref.current, {
          sitekey: SITE_KEY,
          action,
          callback: (token) => onToken?.(token),
          "expired-callback": () => onToken?.(""),
          "error-callback": () => onToken?.(""),
        });
      })
      .catch(() => onToken?.("")); // script blocked → no token; the guarded form stays disabled

    return () => {
      cancelled = true;
      try {
        if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      } catch {
        /* ignore */
      }
    };
    // onToken/action are stable from the caller; render once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="my-2" />;
}
