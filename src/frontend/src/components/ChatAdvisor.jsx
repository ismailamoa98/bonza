// components/ChatAdvisor.jsx — Chat thread with Bonza below the scenario cards.
// Shows the conversation and a message input; sending a message is delegated to
// the parent (which calls the /chat endpoint and may re-highlight a card).
// Props: { messages, onSend, sending }.
import { useEffect, useRef, useState } from "react";

export default function ChatAdvisor({ messages = [], onSend, sending }) {
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
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
        Chat with Bonza
      </div>

      <div ref={threadRef} className="max-h-80 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div className="max-w-[85%]">
              <div
                className={[
                  "whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-bonza text-white"
                    : "bg-slate-100 text-slate-800",
                ].join(" ")}
              >
                {m.content}
              </div>
              {m.meta && (
                <p className="mt-0.5 px-1 text-[11px] text-slate-400">{m.meta}</p>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-400">
              Bonza is typing…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask Bonza anything… e.g. “What if I just pay cash?”"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-bonza focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-lg bg-bonza px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
