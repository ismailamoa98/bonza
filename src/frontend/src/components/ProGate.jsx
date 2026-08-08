// components/ProGate.jsx — wraps Pro-only UI; shows an upgrade prompt for non-Pro users.
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";

export default function ProGate({ children, feature = "this feature" }) {
  const isPro = useAppStore((s) => s.isPro);
  const navigate = useNavigate();

  if (isPro) return children;

  return (
    <div className="rounded-2xl border border-bonza/20 bg-cream p-6 text-center font-jakarta">
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-bonza">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />
        </svg>
        Bonza Pro
      </p>
      <p className="mt-2 font-display text-xl font-semibold text-ink">Unlock {feature}</p>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
        Full points optimisation, award availability and cashback for{" "}
        <span className="font-semibold tabular-nums">£49.99/year</span>. Pays for itself on your first
        hotel booking.
      </p>
      <button
        type="button"
        onClick={() => navigate("/upgrade")}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-bonza px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-bonza-dark"
      >
        Upgrade to Pro
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
      <p className="mt-3 text-[11px] text-ink-muted">Cancel anytime · Pro-rata refund</p>
    </div>
  );
}
