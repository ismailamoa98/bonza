// components/legal/ReAcceptGate.jsx — Phase 25 §25d. A one-time interstitial shown to a signed-in user when a
// material legal document (terms / privacy / booking-terms) has a new version they haven't accepted. It reads
// GET /me/legal; if `outstanding` is non-empty it blocks with a modal summarising the change and linking to the
// version history, with a single affirmative Accept. Only one version exists today, so `outstanding` is empty
// and this never fires — the mechanism is built for the first material change after launch.
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router-dom";
import { getLegalAcceptance, acceptLegal } from "../../utils/api";

const DOC_TITLES = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  "booking-terms": "Booking Terms",
};

export default function ReAcceptGate() {
  const { isSignedIn } = useUser();
  const { pathname } = useLocation();
  const [outstanding, setOutstanding] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      setOutstanding([]);
      return;
    }
    let active = true;
    getLegalAcceptance()
      .then((d) => active && setOutstanding(Array.isArray(d?.outstanding) ? d.outstanding : []))
      .catch(() => active && setOutstanding([]));
    return () => {
      active = false;
    };
  }, [isSignedIn]);

  // Don't trap the user on the auth or the legal pages themselves — they need to read before accepting.
  const onExemptRoute =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up") || pathname.startsWith("/legal");

  if (!isSignedIn || outstanding.length === 0 || onExemptRoute) return null;

  const accept = async () => {
    setSaving(true);
    try {
      const res = await acceptLegal(outstanding.map((o) => o.document), "reaccept");
      setOutstanding(Array.isArray(res?.outstanding) ? res.outstanding : []);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#e6e1d8] bg-white p-6 shadow-[0_8px_32px_rgba(28,25,23,0.18)]">
        <h2 className="font-display text-[20px] font-bold tracking-[-0.01em] text-ink">We&rsquo;ve updated our terms</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          We&rsquo;ve made changes to the following. Please review and accept to continue using Bonza.
        </p>
        <ul className="mt-4 space-y-2">
          {outstanding.map((o) => (
            <li key={o.document} className="flex items-center justify-between rounded-xl border border-[#ece7df] bg-cream px-4 py-3">
              <span className="text-[14px] font-semibold text-ink">{DOC_TITLES[o.document] || o.document}</span>
              <Link to={`/legal/${o.document}/changes`} className="text-[13px] font-semibold text-bonza hover:text-bonza-dark">
                What changed
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={accept}
          disabled={saving}
          className="mt-5 w-full rounded-lg bg-bonza px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-bonza-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Accept and continue"}
        </button>
      </div>
    </div>
  );
}
