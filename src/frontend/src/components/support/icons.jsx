// components/support/icons.jsx — inline SVG icons for the support surfaces (no icon library).
const P = {
  wallet: ["M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H5a2 2 0 0 1-2-2Z", "M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9H5", "M16 13h2"],
  "credit-card": ["M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z", "M3 10h18", "M7 15h3"],
  "calendar-x": ["M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z", "M4 9h16", "M8 2v4", "M16 2v4", "m10 14 4 4", "m14 14-4 4"],
  crown: ["M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z"],
  coin: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M9.5 9.5a2.5 2.5 0 1 1 1 4", "M12 7v2", "M12 15v2"],
  "shield-lock": ["M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z", "M12 11v3", "M9.5 11a2.5 2.5 0 0 1 5 0"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "m21 21-4.3-4.3"],
  chevronRight: ["m9 6 6 6-6 6"],
  phone: ["M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"],
  mail: ["M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z", "m3 7 9 6 9-6"],
  alert: ["M12 3 2 20h20L12 3Z", "M12 9v5", "M12 17h.01"],
  spark: ["M12 3v4", "M12 17v4", "M3 12h4", "M17 12h4", "m6 6 2.5 2.5", "m15.5 15.5 2.5 2.5", "m18 6-2.5 2.5", "m8.5 15.5-2.5 2.5"],
  external: ["M14 5h5v5", "M19 5l-8 8", "M19 13v6H5V5h6"],
  check: ["M20 6 9 17l-5-5"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  "help-circle": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M9.6 9a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6", "M12 17h.01"],
  chevronDown: ["m6 9 6 6 6-6"],
};

export default function Icon({ name, size = 18, sw = 1.8, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {(P[name] || []).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
