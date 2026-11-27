// components/ChatAdvisor.jsx — Chat thread with Bonza below the scenario cards.
// Shows the conversation and a message input; sending a message is delegated to
// the parent (which calls the /chat endpoint and may re-highlight a card).
// Props: { messages, onSend, sending }.
import { useEffect, useRef, useState } from "react";

export default function ChatAdvisor({ messages = [], onSend, sending, onClose }) {
  const [draft, setDraft] = useState("");
  const threadRef = useRef(null);

  // Keep the latest message in view as the thread grows.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const submit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    onSend(text);
    setDraft("");
  };

  return (
    <section className="flex min-h-[26rem] flex-col rounded-2xl border border-[rgba(40,30,20,0.06)] bg-white font-jakarta shadow-[0_1px_2px_rgba(40,30,20,0.04),0_16px_40px_rgba(120,80,50,0.07)]">
      <div className="flex items-center gap-2 border-b border-[#f0ece5] px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bonza text-[13px] font-bold text-white">
          B
        </span>
        <span className="text-[14px] font-semibold text-ink">Chat with Bonza</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide chat"
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-cream hover:text-ink"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div className="max-w-[85%]">
              <div
                className={[
                  "whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed tabular-nums",
                  m.role === "user"
                    ? "bg-white text-ink ring-1 ring-[#e7e1d8]"
                    : "bg-cream text-ink-soft",
                ].join(" ")}
              >
                {m.content}
              </div>
              {m.meta && (
                <p className="mt-0.5 px-1 text-[11px] text-ink-muted">{m.meta}</p>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-cream px-3.5 py-2 text-[13px] text-ink-muted">
              Bonza is typing…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-[#f0ece5] p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask Bonza anything… e.g. “What if I just pay cash?”"
          className="flex-1 rounded-lg border border-[#e0d9cf] px-3 py-2 text-[13px] text-ink focus:border-bonza focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-bonza px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-bonza-dark disabled:opacity-50"
        >
          Send
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </section>
  );
}
