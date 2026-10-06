// components/CookieConsent.jsx — cookie-consent banner + preferences modal. Shows the banner until the visitor
// chooses (Accept all · Reject non-essential · Manage); the modal lets them set per-category choices. Rendered
// globally in App; the footer "Privacy settings" link reopens the modal via the OPEN_EVENT. Strictly-necessary
// cookies are always on. Choice is stored in localStorage (utils/consent.js).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConsent, saveConsent, OPEN_EVENT } from "../utils/consent";

const CATEGORIES = [
  { key: "necessary", title: "Strictly necessary", desc: "Sign-in, session security and core features. Always on — the site can’t work without these.", locked: true },
  { key: "functional", title: "Functional", desc: "Remembers preferences such as your origin, recent searches and UI choices." },
  { key: "analytics", title: "Analytics", desc: "Aggregated usage data so we can understand and improve the service." },
];

function Toggle({ on, locked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={locked}
      onClick={() => !locked && onChange(!on)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${on ? "bg-bonza" : "bg-[#d8d2c8]"} ${locked ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function CookieConsent() {
  const [decided, setDecided] = useState(true); // assume decided until mount reads storage (avoids flash)
  const [modalOpen, setModalOpen] = useState(false);
  const [prefs, setPrefs] = useState({ functional: true, analytics: true });

  useEffect(() => {
    const existing = getConsent();
    setDecided(!!existing);
    if (existing) setPrefs({ functional: existing.functional, analytics: existing.analytics });
    const onOpen = () => {
      const cur = getConsent();
      if (cur) setPrefs({ functional: cur.functional, analytics: cur.analytics });
      setModalOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setModalOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const choose = (functional, analytics) => {
    saveConsent({ functional, analytics });
    setDecided(true);
    setModalOpen(false);
  };

  const showBanner = !decided && !modalOpen;

  return (
    <>
      {showBanner && (
        <div className="fixed inset-x-0 bottom-0 z-[55] px-4 pb-4" role="region" aria-label="Cookie consent">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-[#e6e1d8] bg-white p-4 shadow-[0_18px_50px_rgba(40,30,20,0.18)] sm:flex-row sm:items-center sm:gap-5">
            <p className="flex-1 text-[13px] leading-relaxed text-ink-soft">
              We use cookies to keep Bonza working, remember your preferences and improve the service. You can accept
              all, reject non-essential, or choose. See our{" "}
              <Link to="/cookies" className="font-semibold text-bonza hover:text-bonza-dark">Cookie Policy</Link>.
            </p>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              <button type="button" onClick={() => setModalOpen(true)} className="rounded-lg border border-[#e3ded6] bg-white px-3 py-2 text-[13px] font-semibold text-ink hover:border-bonza hover:text-bonza">
                Manage
              </button>
              <button type="button" onClick={() => choose(false, false)} className="rounded-lg border border-[#e3ded6] bg-white px-3 py-2 text-[13px] font-semibold text-ink hover:border-bonza hover:text-bonza">
                Reject non-essential
              </button>
              <button type="button" onClick={() => choose(true, true)} className="rounded-lg bg-bonza px-4 py-2 text-[13px] font-semibold text-white hover:bg-bonza-dark">
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Cookie preferences">
          <button type="button" aria-label="Close" onClick={() => setModalOpen(false)} className="absolute inset-0 bg-[rgba(18,22,20,0.4)]" />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(12,16,18,0.3)]">
            <div className="border-b border-[#f0ebe3] px-5 py-4">
              <h2 className="font-display text-[18px] font-semibold text-ink">Cookie preferences</h2>
              <p className="mt-1 text-[12.5px] text-ink-muted">Choose which cookies Bonza can use. See our <Link to="/cookies" className="font-semibold text-bonza hover:text-bonza-dark">Cookie Policy</Link>.</p>
            </div>
            <div className="max-h-[50vh] space-y-4 overflow-y-auto px-5 py-4">
              {CATEGORIES.map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink">{c.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{c.desc}</p>
                  </div>
                  <Toggle
                    on={c.locked ? true : prefs[c.key]}
                    locked={c.locked}
                    onChange={(v) => setPrefs((p) => ({ ...p, [c.key]: v }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[#f0ebe3] px-5 py-3">
              <button type="button" onClick={() => choose(false, false)} className="rounded-lg border border-[#e3ded6] bg-white px-3 py-2 text-[13px] font-semibold text-ink hover:border-bonza hover:text-bonza">
                Reject non-essential
              </button>
              <button type="button" onClick={() => choose(prefs.functional, prefs.analytics)} className="rounded-lg bg-bonza px-4 py-2 text-[13px] font-semibold text-white hover:bg-bonza-dark">
                Save preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
