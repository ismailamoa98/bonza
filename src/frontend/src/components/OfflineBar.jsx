// components/OfflineBar.jsx — Phase 24 §24i. A thin stone bar below the nav while offline. No modal, no
// blocking — searches/bookings/payments disable their own buttons; queued mutations replay on reconnect.
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function OfflineBar() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-stone-700 px-4 py-1.5 text-center text-[12.5px] font-medium text-stone-50"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 1l22 22M8.5 16.5a5 5 0 0 1 7 0M5 13a9 9 0 0 1 9-2.6M12 20h.01" />
      </svg>
      You’re offline — Bonza will pick up where you left off.
    </div>
  );
}
