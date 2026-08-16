// components/search/icons.jsx — small inline SVG icons (project convention: no icon fonts, no emoji).
const s = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const XIcon = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const ShareIcon = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...s} {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </svg>
);

export const CheckIcon = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const CameraIcon = (p) => (
  <svg width="11" height="11" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

export const StarIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" {...p}>
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const CardIcon = (p) => (
  <svg width="12" height="12" viewBox="0 0 24 24" {...s} {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

export const LockIcon = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...s} {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const ShieldIcon = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const RefreshIcon = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export const HeadsetIcon = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="2" y="14" width="4" height="6" rx="1" />
    <rect x="18" y="14" width="4" height="6" rx="1" />
    <path d="M18 20a4 4 0 0 1-4 3h-2" />
  </svg>
);

export const PlaneIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a.5.5 0 0 0-.5.8l3.5 3.9-2 3H3l1 3 3 1 .1-2.8 3-2 3.9 3.5a.5.5 0 0 0 .8-.4z" />
  </svg>
);

export const SparklesIcon = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M12 3v4M12 17v4M5 12H1M23 12h-4M6.3 6.3 4 4M20 20l-2.3-2.3M17.7 6.3 20 4M4 20l2.3-2.3" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const SendIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </svg>
);

export const MapPinIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const SearchOffIcon = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...s} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3M8 8l6 6" />
  </svg>
);

// ── Amenity icons (used as tiles in the Hotel details tab) ─────────────────────
export const WifiIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M5 12.5a10 10 0 0 1 14 0" />
    <path d="M8.5 16a5 5 0 0 1 7 0" />
    <path d="M2 9a15 15 0 0 1 20 0" />
    <circle cx="12" cy="19.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const PoolIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M2 16c1.5 0 1.5 1.2 3 1.2S8 16 9.5 16s1.5 1.2 3 1.2S15 16 16.5 16s1.5 1.2 3 1.2S21 16 22 16" />
    <path d="M2 20c1.5 0 1.5 1.2 3 1.2S8 20 9.5 20s1.5 1.2 3 1.2S15 20 16.5 20s1.5 1.2 3 1.2S21 20 22 20" />
    <path d="M7 15V5a2 2 0 0 1 4 0M15 15V5a2 2 0 0 1 4 0" />
  </svg>
);

export const CoffeeIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
    <path d="M17 9h2a2 2 0 0 1 0 4h-2" />
    <path d="M8 2v2M12 2v2" />
  </svg>
);

export const ParkingIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M9 17V7h3.5a3 3 0 0 1 0 6H9" />
  </svg>
);

export const GlassIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M5 4h14l-6 7v7" />
    <path d="M9 21h6" />
  </svg>
);

export const SpaIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M12 21c0-5 3-9 8-11-1 6-4 9-8 11z" />
    <path d="M12 21c0-5-3-9-8-11 1 6 4 9 8 11z" />
    <path d="M12 21v-6" />
  </svg>
);

export const DumbbellIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
  </svg>
);
