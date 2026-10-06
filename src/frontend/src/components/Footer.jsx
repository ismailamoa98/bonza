// components/Footer.jsx — shared site footer rendered app-wide (App.jsx, after <main>). Cream/light theme to
// match the locked palette. Hidden on auth and full-screen flows. Internal routes are real <Link>s; the Legal
// and Company links are placeholders until those pages exist (tracked in pre-go-live.md), and the locale chip
// is presentational (no switcher yet).
import { Link, useLocation } from "react-router-dom";
import { openCookiePreferences } from "../utils/consent";

const HIDE_ON = ["/sign-in", "/sign-up", "/search", "/onboarding", "/points/connecting"];

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "Explore everywhere", to: "/explore" },
      { label: "Destinations for you", to: "/destinations" },
      { label: "Points", to: "/points" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Trips", to: "/bookings" },
      { label: "Settings", to: "/settings" },
      { label: "Bonza Pro", to: "/upgrade" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", to: "/privacy" },
      { label: "Terms of service", to: "/terms" },
      { label: "Cookie policy", to: "/cookies" },
      { label: "Privacy settings", onClick: openCookiePreferences },
      { label: "Complaints", to: "/help/complaints" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help centre", to: "/help" },
      { label: "Contact support", to: "/help/contact" },
      { label: "Service status", to: "/status" },
    ],
  },
];

function FooterLink({ link }) {
  const cls = "text-[13px] text-ink-soft transition-colors hover:text-bonza";
  if (link.to) return <Link to={link.to} className={cls}>{link.label}</Link>;
  if (link.onClick)
    return (
      <button type="button" onClick={link.onClick} className={`${cls} text-left`}>
        {link.label}
      </button>
    );
  return <a href={link.href} className={cls}>{link.label}</a>;
}

export default function Footer() {
  const { pathname } = useLocation();
  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  return (
    <footer className="border-t border-[#e6e1d8] bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr]">
          {/* Brand + locale */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bonza text-[14px] font-semibold text-white">B</span>
              <span className="font-display text-[18px] font-semibold text-ink">Bonza</span>
            </div>
            <span className="mt-4 inline-flex items-center rounded-full border border-[#e3ded6] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft">
              United Kingdom · English (UK) · £ GBP
            </span>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#e6e1d8] pt-6 sm:flex-row">
          <p className="text-[12px] text-ink-muted">Powered by Claude, Plaid &amp; 50+ partner APIs</p>
          <p className="text-[12px] text-ink-muted">© Bonza {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
