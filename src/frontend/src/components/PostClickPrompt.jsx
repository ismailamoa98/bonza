// components/PostClickPrompt.jsx — post-affiliate-click prompt to self-report a booking.
import { useState } from "react";
import { confirmJourneyBooking } from "../utils/api";

const PROGRAMME_NAMES = {
  marriott_bonvoy: "Marriott Bonvoy",
  hilton_honors: "Hilton Honors",
  world_of_hyatt: "World of Hyatt",
  ihg_one: "IHG One Rewards",
  amex_mr: "Amex Membership Rewards",
  chase_ur: "Chase Ultimate Rewards",
  united_mp: "United MileagePlus",
  ba_avios: "BA Avios",
  aeroplan: "Air Canada Aeroplan",
};
const programmeName = (key) => PROGRAMME_NAMES[key] || key || "your";

export default function PostClickPrompt({ journeyId, programme, leg, onClose }) {
  const [state, setState] = useState("ask"); // 'ask' | 'saving' | 'done'

  if (!journeyId) return null;

  const handleYes = async () => {
    setState("saving");
    try {
      await confirmJourneyBooking(journeyId, leg);
      setState("done");
      setTimeout(() => onClose?.(), 2200);
    } catch {
      setState("ask");
    }
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-xs animate-slideup rounded-2xl border border-[rgba(40,30,20,0.08)] bg-white p-5 font-jakarta shadow-[0_16px_40px_rgba(120,80,50,0.18)] motion-reduce:animate-none"
    >
      {state === "done" ? (
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E7E40" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-[13px] font-semibold text-ink">Logged — your Bonza Credits are tracking.</p>
        </div>
      ) : (
        <>
          <p className="text-[14px] font-semibold leading-snug text-ink">
            Did you complete your {programmeName(programme)} booking?
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            Let us know so we can track your Bonza Credits.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleYes}
              disabled={state === "saving"}
              className="flex-1 rounded-lg bg-bonza px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-bonza-dark disabled:opacity-60"
            >
              {state === "saving" ? "Saving…" : "Yes, booked"}
            </button>
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={state === "saving"}
              className="flex-1 rounded-lg bg-cream px-3 py-2 text-[12px] font-semibold text-ink-soft transition-colors hover:bg-[#ece9e1] disabled:opacity-60"
            >
              Not yet
            </button>
          </div>
        </>
      )}
    </div>
  );
}
