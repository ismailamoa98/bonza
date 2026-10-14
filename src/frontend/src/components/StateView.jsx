// components/StateView.jsx — Phase 24 §24e. One component for every empty / error / degraded / offline
// state, so the whole app fails in one visual language. Replaces the ad-hoc "Loading…" / "Something went
// wrong" strings. Inline SVG icons only (no Tabler, no emoji).
import { Link } from "react-router-dom";

// Written empty-state copy (§24e) — keyed by surface, never generated at runtime.
export const COPY = {
  search_no_packages: { title: "No packages for these dates", body: "Award space on this route is thin right now. Try a wider date range, or let Bonza watch it for you." },
  search_cash_only: { title: "No award space found", body: "Every option here is cash — nothing is bookable with points on these dates. The cash prices below are still the best we found." },
  points_no_programmes: { title: "No programmes connected yet", body: "Add a programme and Bonza starts pricing every search both ways — points and cash." },
  points_zero_balance: { title: "Nothing to show yet", body: "Once this programme has a balance, Bonza prices it into every search." },
  activity_empty: { title: "No activity yet", body: "Statement syncs, manual edits and redemptions will appear here." },
  bookings_empty: { title: "No bookings yet", body: "Trips you book through Bonza land here, with your credits balance." },
  credits_zero: { title: "No credits yet", body: "You earn 3% back in Bonza Credits on every cash booking." },
  city_no_routes: { title: "No award routes cached", body: "Bonza refreshes award space here weekly. Search the route directly for live availability." },
  tickets_empty: { title: "No open tickets", body: "Anything you raise with support shows up here with its reference." },
  saved_empty: { title: "Nothing saved", body: "Save a search and Bonza re-prices it nightly, then emails you when it drops." },
};

const ICON = {
  // inbox
  empty: <path d="M4 13l2.5-7.5A2 2 0 0 1 8.4 4h7.2a2 2 0 0 1 1.9 1.5L20 13m-16 0v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5m-16 0h4l1.5 2.5h5L16 13h4" />,
  // alert-triangle
  error: <path d="M12 9v4m0 4h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z" />,
  // alert-circle
  degraded: (<><circle cx="12" cy="12" r="9" /><path d="M12 8v4m0 4h.01" /></>),
  // wifi-off
  offline: <path d="M1 1l22 22M8.5 16.5a5 5 0 0 1 7 0M5 13a9 9 0 0 1 9-2.6M2 8.8a15 15 0 0 1 4.2-2.5M20 12a9 9 0 0 0-3-2m4.9-1.2A15 15 0 0 0 12 5M12 20h.01" />,
};

const CIRCLE = {
  empty: "bg-cream-200 text-stone-400",
  error: "bg-rose-50 text-rose-500",
  degraded: "bg-amber-50 text-amber-600",
  offline: "bg-stone-100 text-stone-500",
};

const PAD = { inline: "py-8", section: "py-12", page: "py-16" };

function Action({ action, variant }) {
  if (!action) return null;
  const primary = variant === "primary";
  const cls = primary
    ? "inline-flex h-10 items-center justify-center rounded-xl bg-bonza px-5 text-sm font-medium text-white hover:bg-bonza-dark"
    : "text-sm text-stone-500 underline-offset-4 hover:underline";
  if (action.to) return <Link to={action.to} className={cls}>{action.label}</Link>;
  return <button type="button" onClick={action.onClick} className={cls}>{action.label}</button>;
}

export default function StateView({
  variant = "empty",
  icon,
  title,
  body,
  primaryAction,
  secondaryAction,
  size = "section",
  children,
}) {
  const glyph = icon || ICON[variant];
  return (
    <div className={`mx-auto flex max-w-md flex-col items-center px-6 text-center ${PAD[size] || PAD.section}`} role={variant === "error" ? "alert" : undefined}>
      {variant === "degraded" && <div className="mb-4 h-px w-16 bg-amber-200" />}
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${CIRCLE[variant] || CIRCLE.empty}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {glyph}
        </svg>
      </div>
      {title && <p className="mt-4 text-[15px] font-semibold text-stone-900">{title}</p>}
      {body && <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{body}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Action action={primaryAction} variant="primary" />
          <Action action={secondaryAction} variant="secondary" />
        </div>
      )}
      {/* degraded shows partial results BELOW the message rather than replacing them */}
      {variant === "degraded" && children ? <div className="mt-6 w-full text-left">{children}</div> : null}
    </div>
  );
}
