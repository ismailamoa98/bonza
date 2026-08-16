// components/search/ChatDrawer.jsx — the Bonza advisor as a slide-in drawer (moved off the main layout).
// Lazily spins up a trip context from the current search so the real /chat endpoint has something to
// reason about; degrades to a friendly message if that can't be established.
import { useEffect, useRef, useState } from "react";
import { createTrip, optimizeTrip, sendChatMessage } from "../../utils/api";
import { SparklesIcon, SendIcon, XIcon } from "./icons";

export default function ChatDrawer({ open, onClose, searchContext }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const tripIdRef = useRef(null);
  const meta = searchContext?.meta;

  useEffect(() => {
    if (open && messages.length === 0 && meta) {
      const range = [meta.departureDate, meta.returnDate].filter(Boolean).join(" – ");
      setMessages([
        {
          role: "bonza",
          content: `I've pulled up ${meta.origin ? `${meta.origin} → ` : ""}${meta.destination}${
            range ? `, ${range}` : ""
          } for ${meta.travelers} ${meta.travelers === 1 ? "adult" : "adults"}. Ask me to compare options, explain the points value, or suggest better dates.`,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ensureTrip() {
    if (tripIdRef.current) return tripIdRef.current;
    const { id } = await createTrip({
      origin: meta.origin || "LHR",
      destination: meta.destination,
      checkIn: meta.departureDate,
      checkOut: meta.returnDate,
      numberOfTravelers: meta.travelers || 2,
      preferences: { style: meta.travelStyle || "points_max" },
    });
    tripIdRef.current = id;
    await optimizeTrip(id).catch(() => {});
    return id;
  }

  async function send() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const tripId = await ensureTrip();
      const { response } = await sendChatMessage(tripId, null, text);
      setMessages((prev) => [...prev, { role: "bonza", content: response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bonza", content: "Sorry — I couldn't reach the advisor just now. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} aria-hidden="true" />}

      <div
        role="dialog"
        aria-label="Chat with Bonza"
        aria-modal="true"
        className={`fixed right-0 top-0 h-full w-[380px] max-w-full bg-white z-50 flex flex-col border-l border-ink-900/[0.06] shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-900/[0.06]">
          <div className="flex items-center gap-2 text-bonza">
            <SparklesIcon />
            <span className="text-[13px] font-semibold text-ink-900">Ask Bonza</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-cream border border-ink-900/[0.08] flex items-center justify-center text-ink-300"
            aria-label="Close chat"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user" ? "bg-bonza text-white" : "bg-cream text-ink-900"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-cream rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-3 border-t border-ink-900/[0.06]">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about points value, alternatives, best dates…"
              rows={2}
              className="flex-1 resize-none text-[13px] text-ink-900 bg-cream rounded-xl px-3 py-2.5 border border-ink-900/[0.08] outline-none placeholder-ink-300 leading-relaxed"
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-full bg-bonza text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
