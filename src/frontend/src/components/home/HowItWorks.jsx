// components/home/HowItWorks.jsx — Phase 18 (§18j). Replaces the numbered-circle block. Three white cards
// on a warm panel, each with an icon chip and step number. Copy corrected: balances come from statement
// emails (Gmail/Outlook), not Plaid; points legs deep-link to the programme, they are not one-click.
// Inline SVG icons (no webfont).

// Envelope — statement emails
function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

// Magnifier — search the trip
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

// Split arrows — cash or points mix
function SplitIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 10H20l-3.5-3.5M17 14H4l3.5 3.5" />
    </svg>
  );
}

const STEPS = [
  {
    icon: <MailIcon />,
    title: "Connect your points",
    body: "Link Gmail or Outlook and Bonza reads your balances from statement emails. No loyalty passwords.",
  },
  {
    icon: <SearchIcon />,
    title: "Tell us the trip",
    body: "Where, when and who. Bonza checks cash fares and award seats across airlines and hotels.",
  },
  {
    icon: <SplitIcon />,
    title: "Book the best mix",
    body: "See each leg in cash or points, then book cash legs on Bonza and points legs with the programme.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-cream py-16">
      <div className="max-w-[1080px] mx-auto px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bonza">How it works</p>
        <h2 className="mt-2 font-display text-[2rem] font-semibold text-[#141210] tracking-[-0.02em]">
          Your best trip in three steps.
        </h2>

        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(26,22,19,0.05)]">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bonza-100 text-bonza">
                  {s.icon}
                </span>
                <span className="text-[13px] font-bold tabular-nums text-[#C9C0B4]">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-[#141210]">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#7A7269]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
