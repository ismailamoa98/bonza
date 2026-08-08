// pages/StepIndicator.jsx — Progress indicator for the 3-step flow.
// Renders "Your trip | Optimize | Book" and highlights the active step in terra;
// completed steps stay terra (with a check), upcoming steps are muted.
// Props: { currentStep: 1 | 2 | 3 }.
const STEPS = [
  { n: 1, label: "Your trip" },
  { n: 2, label: "Optimize" },
  { n: 3, label: "Book" },
];

export default function StepIndicator({ currentStep = 1 }) {
  return (
    <nav className="flex items-center justify-center gap-3 py-4 font-jakarta text-sm sm:gap-4">
      {STEPS.map((step, i) => {
        const active = step.n === currentStep;
        const done = step.n < currentStep;
        return (
          <div key={step.n} className="flex items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-2">
              <span
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold tabular-nums transition-colors",
                  active || done ? "bg-bonza text-white" : "bg-[#e7e1d8] text-ink-muted",
                ].join(" ")}
              >
                {done ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  step.n
                )}
              </span>
              <span
                className={[
                  "font-medium transition-colors",
                  active ? "font-semibold text-bonza" : done ? "text-ink-soft" : "text-ink-muted",
                ].join(" ")}
              >
                {step.label}
              </span>
            </span>
            {i < STEPS.length - 1 && (
              <span className={`h-px w-6 sm:w-10 ${done ? "bg-bonza/40" : "bg-[#e0d9cf]"}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
