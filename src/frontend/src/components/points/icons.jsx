// components/points/icons.jsx — inline SVG icons for the Points portfolio (no emoji, no icon webfont).
const s = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export const WalletIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2" />
    <path d="M21 12a2 2 0 0 0-2-2h-4a2 2 0 0 0 0 4h4a2 2 0 0 0 2-2Z" />
  </svg>
);

export const ExchangeIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M3 8h14M13 4l4 4-4 4" />
    <path d="M21 16H7M11 20l-4-4 4-4" />
  </svg>
);

export const ClockIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const PlusIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ChevronRightIcon = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...s} {...p}>
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

export const ChevronDownIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const XIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const SearchIcon = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...s} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const CheckIcon = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...s} {...p}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const RefreshIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <polyline points="21 3 21 9 15 9" />
  </svg>
);

export const InfoIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const AlertTriangleIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

export const ArrowRightIcon = (p) => (
  <svg width="12" height="12" viewBox="0 0 24 24" {...s} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const LockIcon = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...s} {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
