// pages/TicketView.jsx — Phase 22. View a support ticket thread by reference. Logged-in owners see it directly;
// logged-out users enter the email they raised it with.
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTicket, apiErrorMessage } from "../utils/api";
import { useAppStore } from "../store/appStore";

export default function TicketView() {
  const { ref } = useParams();
  const user = useAppStore((s) => s.user);
  const [ticket, setTicket] = useState(null);
  const [email, setEmail] = useState("");
  const [needEmail, setNeedEmail] = useState(false);
  const [error, setError] = useState(null);

  const load = (withEmail) => {
    getTicket(ref, withEmail)
      .then((t) => {
        setTicket(t);
        setNeedEmail(false);
        setError(null);
      })
      .catch((e) => {
        if (!user && !withEmail) setNeedEmail(true);
        else setError(apiErrorMessage(e));
      });
  };

  useEffect(() => {
    load(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  if (needEmail && !ticket) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-display text-[24px] font-bold text-ink">View request {ref}</h1>
        <p className="mt-2 text-[14px] text-ink-soft">Enter the email you used to raise this request.</p>
        <form onSubmit={(e) => { e.preventDefault(); load(email); }} className="mt-4 flex gap-2">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="min-w-0 flex-1 rounded-lg border border-[#e3ded6] bg-white px-3 py-2.5 text-[14px] text-ink focus:border-bonza focus:outline-none" />
          <button type="submit" className="rounded-lg bg-[#141210] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#332B25]">View</button>
        </form>
        {error && <p className="mt-2 text-[13px] text-red-500">{error}</p>}
      </div>
    );
  }

  if (error) return <div className="mx-auto max-w-md px-6 py-16 text-center text-[14px] text-ink-soft">{error} <Link to="/help" className="font-semibold text-bonza">Help</Link></div>;
  if (!ticket) return <div className="mx-auto max-w-2xl px-6 py-16" aria-hidden="true"><div className="h-6 w-40 rounded bg-[#EFEBE4]" /></div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted tabular-nums">{ticket.reference} · {ticket.status}</p>
      <h1 className="mt-1 font-display text-[24px] font-bold text-ink">{ticket.subject}</h1>
      <div className="mt-6 space-y-3">
        {ticket.messages.map((m, i) => (
          <div key={i} className={`flex ${m.author === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${m.author === "user" ? "bg-bonza text-white" : "bg-cream text-ink"}`}>
              <p>{m.body}</p>
              <p className={`mt-1 text-[10.5px] ${m.author === "user" ? "text-white/70" : "text-ink-muted"}`}>{m.author === "user" ? "You" : m.author === "assistant" ? "Bonza assistant" : "Bonza team"} · {new Date(m.createdAt).toLocaleString("en-GB")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
