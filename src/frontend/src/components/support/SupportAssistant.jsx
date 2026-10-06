// components/support/SupportAssistant.jsx — Phase 22 §22f. Chat with the support assistant. On an escalation it
// shows the created BZ- reference and stops. "Email a human instead" is always visible, never buried.
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { askAssistant, apiErrorMessage } from "../../utils/api";
import Icon from "./icons";

export default function SupportAssistant({ seedMessage }) {
  const [history, setHistory] = useState([{ author: "assistant", body: "Hi — I'm Bonza's assistant. Ask me about points, Pro, Credits or your account. If something needs a person, I'll pass it on." }]);
  const [input, setInput] = useState(seedMessage || "");
  const [sending, setSending] = useState(false);
  const [escalatedRef, setEscalatedRef] = useState(null);
  const scrollRef = useRef(null);

  const send = async (e) => {
    e?.preventDefault();
    const message = input.trim();
    if (!message || sending || escalatedRef) return;
    const nextHistory = [...history, { author: "user", body: message }];
    setHistory(nextHistory);
    setInput("");
    setSending(true);
    try {
      const res = await askAssistant(message, history);
      setHistory((h) => [...h, { author: "assistant", body: res.reply }]);
      if (res.escalated && res.reference) setEscalatedRef(res.reference);
    } catch (err) {
      setHistory((h) => [...h, { author: "assistant", body: apiErrorMessage(err) }]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 0);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
      <div ref={scrollRef} className="max-h-[420px] min-h-[220px] flex-1 space-y-3 overflow-y-auto p-4">
        {history.map((m, i) => (
          <div key={i} className={`flex ${m.author === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${m.author === "user" ? "bg-bonza text-white" : "bg-cream text-ink"}`}>{m.body}</div>
          </div>
        ))}
        {sending && <div className="text-[12px] text-ink-muted">Bonza is thinking…</div>}
        {escalatedRef && (
          <div className="rounded-xl border border-[#cfe8d8] bg-[#eef7f1] px-3.5 py-3 text-[13px] text-[#1E7E40]">
            Passed to the team. Your reference is <b>{escalatedRef}</b> —{" "}
            <Link to={`/help/ticket/${escalatedRef}`} className="font-semibold underline">view it</Link>.
          </div>
        )}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-[#f0ebe3] p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!!escalatedRef}
          placeholder={escalatedRef ? "This conversation was passed to a person" : "Type your question…"}
          className="min-w-0 flex-1 rounded-lg border border-[#e3ded6] bg-white px-3 py-2 text-[14px] text-ink focus:border-bonza focus:outline-none disabled:bg-[#f6f3ee]"
        />
        <button type="submit" disabled={sending || !!escalatedRef || !input.trim()} className="flex-shrink-0 rounded-lg bg-[#141210] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#332B25] disabled:opacity-40">Send</button>
      </form>
      <div className="flex items-center justify-between border-t border-[#f0ebe3] px-3 py-2 text-[12px] text-ink-muted">
        <span>Bonza can&rsquo;t change programme bookings — only the programme can.</span>
        <Link to="/help/contact?urgency=booking_issue" className="inline-flex items-center gap-1 font-semibold text-bonza hover:text-bonza-dark">
          <Icon name="mail" size={13} /> Email a human
        </Link>
      </div>
    </div>
  );
}
