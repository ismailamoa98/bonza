// components/NotificationBell.jsx — nav bell: unread count, dropdown list, mark-read/dismiss.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, markAllNotificationsRead, dismissNotification } from "../utils/api";

const ICONS = {
  award_availability: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 4.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
  expiry_warning: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>,
  price_drop: <><polyline points="3 7 9 13 13 9 21 17" /><polyline points="21 11 21 17 15 17" /></>,
  monthly_summary: <><line x1="6" y1="20" x2="6" y2="12" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="18" y1="20" x2="18" y2="9" /></>,
  booking_confirmed: <><circle cx="12" cy="12" r="9" /><polyline points="8 12 11 15 16 9" /></>,
  credits_awarded: <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />,
  pro_activated: <path d="M3 8l4.5 3L12 5l4.5 6L21 8l-1.5 11h-15L3 8z" />,
  default: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
};

const iconTint = {
  award_availability: "bg-[#EAF6EE] text-[#1E7E40]",
  expiry_warning: "bg-[#FBF2EE] text-bonza",
  price_drop: "bg-[#EAF6EE] text-[#1E7E40]",
  monthly_summary: "bg-cream text-ink-soft",
  booking_confirmed: "bg-[#EAF6EE] text-[#1E7E40]",
  credits_awarded: "bg-[#FBE8E0] text-bonza",
  pro_activated: "bg-[#FBE8E0] text-bonza",
  default: "bg-cream text-ink-soft",
};

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell({ overlay = false }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef(null);

  const unread = notifications.filter((n) => !n.readAt && !n.dismissedAt).length;

  const load = useCallback(() => {
    getNotifications()
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      markAllNotificationsRead().catch(() => {});
      setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    }
  };

  const onDismiss = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    dismissNotification(id).catch(() => {});
  };

  const openCta = (n) => {
    if (!n.ctaUrl) return;
    setOpen(false);
    try {
      const url = new URL(n.ctaUrl, window.location.origin);
      if (url.origin === window.location.origin) navigate(url.pathname + url.search);
      else window.open(n.ctaUrl, "_blank", "noopener");
    } catch {
      if (n.ctaUrl.startsWith("/")) navigate(n.ctaUrl);
    }
  };

  const btnClass = overlay
    ? "border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20"
    : "border-[#e3ded6] bg-white text-ink-soft hover:border-bonza hover:text-bonza";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ""}`}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${btnClass}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bonza px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl bg-white shadow-[0_16px_48px_rgba(40,30,20,0.18)] ring-1 ring-black/5"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-[#f0ece5] px-4 py-3">
            <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink">Notifications</span>
            <button type="button" onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[13px] text-ink-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => openCta(n)}
                    className={`group flex cursor-pointer gap-3 border-b border-[#f4f0ea] px-4 py-3 transition-colors hover:bg-cream ${isUnread ? "bg-[#FBF8F6]" : "bg-white"}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconTint[n.type] || iconTint.default}`}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {ICONS[n.type] || ICONS.default}
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold leading-tight text-ink">{n.title}</p>
                      <p className="mt-0.5 text-[11px] leading-tight text-ink-soft">{n.body}</p>
                      <p className="mt-1 text-[10px] text-ink-muted">{relativeTime(n.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => onDismiss(e, n.id)}
                      className="shrink-0 text-ink-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
                      aria-label="Dismiss"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
