// pages/Complaints.jsx — Phase 22 §22j. The documented complaints process (UK consumer law expects one).
// The ADR body + ABTA/CAA routing are placeholders pending legal (tracked in pre-go-live.md).
import { Link } from "react-router-dom";

const STAGES = [
  { n: 1, title: "Contact support", body: "Raise it with our team. We aim to resolve complaints within 5 working days." },
  { n: 2, title: "Ask for escalation", body: "If it's unresolved, ask us to escalate. A manager will respond within 10 working days." },
  { n: 3, title: "Independent review", body: "If it's still unresolved after 8 weeks, or once we issue a final response, you may refer the matter to the relevant Alternative Dispute Resolution (ADR) body. [ADR scheme to be confirmed.]" },
];

export default function Complaints() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="font-display text-[30px] font-bold tracking-[-0.01em] text-ink">Complaints</h1>
      <p className="mt-5 rounded-xl border border-[#ece7df] bg-[#FBFAF8] px-4 py-3 text-[13px] italic text-ink-muted">
        This process is a draft pending legal review — the applicable ADR scheme and final-response wording will be confirmed before launch.
      </p>
      <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">We take complaints seriously and aim to put things right quickly. Here&rsquo;s how it works.</p>

      <ol className="mt-8 space-y-4">
        {STAGES.map((s) => (
          <li key={s.n} className="flex gap-4 rounded-2xl border border-[#e6e1d8] bg-white p-5">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#141210] text-[14px] font-bold text-white">{s.n}</span>
            <div>
              <p className="text-[15px] font-bold text-ink">Stage {s.n} — {s.title}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex items-center justify-between border-t border-[#e6e1d8] pt-5 text-[13px]">
        <span className="text-ink-muted">Ready to start?</span>
        <Link to="/help/contact" className="font-semibold text-bonza hover:text-bonza-dark">Contact support →</Link>
      </div>
    </div>
  );
}
