// pages/StepIndicator.jsx — Progress indicator for the 3-step flow.
// Renders "1. Trip Details | 2. Optimization | 3. Booking Link" and underlines
// the active step. Props: { currentStep: 1 | 2 | 3 }.
const STEPS = [
  { n: 1, label: "Trip Details" },
  { n: 2, label: "Optimization" },
  { n: 3, label: "Booking Link" },
];

export default function StepIndicator({ currentStep = 1 }) {
  return (
    <nav className="flex items-center justify-center gap-2 sm:gap-4 py-4 text-sm">
      {STEPS.map((step, i) => {
        const active = step.n === currentStep;
        const done = step.n < currentStep;
        return (
          <div key={step.n} className="flex items-center gap-2 sm:gap-4">
            <span
              className={[
                "pb-0.5 transition-colors",
                active
                  ? "font-semibold text-bonza border-b-2 border-bonza"
                  : done
                  ? "text-slate-500"
                  : "text-slate-400",
              ].join(" ")}
            >
              {step.n}. {step.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-slate-300">|</span>}
          </div>
        );
      })}
    </nav>
  );
}
