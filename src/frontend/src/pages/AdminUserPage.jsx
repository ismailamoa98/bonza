// pages/AdminUserPage.jsx — Phase 22 §22i. Read-only account inspector (admin-gated by the API). No mutations.
// Opening it writes an admin_viewed_account event server-side.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAdminUser, apiErrorMessage } from "../utils/api";

const money = (n) => (n == null ? "—" : `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const date = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

function Section({ title, children }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-[#e6e1d8] bg-white">{children}</div>
    </section>
  );
}
function Row({ cells }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[#f0ebe3] px-4 py-2.5 text-[13px] last:border-0 tabular-nums">
      <span className="truncate text-ink">{cells[0]}</span>
      <span className="flex-shrink-0 text-right text-ink-soft">{cells[1]}</span>
    </div>
  );
}

export default function AdminUserPage() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAdminUser(userId).then(setData).catch((e) => setError(apiErrorMessage(e)));
  }, [userId]);

  if (error) return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-[14px] text-ink-soft">{error}</div>;
  if (!data) return <div className="mx-auto max-w-3xl px-6 py-16" aria-hidden="true"><div className="h-8 w-56 rounded bg-[#EFEBE4]" /></div>;

  const a = data.account;
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-bonza">Admin · read-only</p>
      <h1 className="mt-1 font-display text-[24px] font-bold text-ink">{a.name || "—"}</h1>
      <p className="text-[13px] text-ink-soft">{a.email} · {a.id}</p>

      <Section title="Account">
        <Row cells={["Home airport", a.homeAirport || "—"]} />
        <Row cells={["Signed up", date(a.createdAt)]} />
        <Row cells={["Bonza Pro", a.pro ? `${a.pro.status}${a.pro.currentPeriodEnd ? ` · to ${date(a.pro.currentPeriodEnd)}` : ""}` : "none"]} />
      </Section>

      <Section title={`Bookings (${data.bookings.length})`}>
        {data.bookings.length ? data.bookings.map((b) => <Row key={b.id} cells={[`${b.description || b.leg} · ${b.supplier} · ${b.confirmationMethod}`, `${b.status}${b.supplierReference ? ` · ${b.supplierReference}` : ""}`]} />) : <Row cells={["No bookings", ""]} />}
      </Section>

      <Section title={`Balances (${data.balances.length})`}>
        {data.balances.length ? data.balances.map((x, i) => <Row key={i} cells={[`${x.programme}${x.statusTier ? ` · ${x.statusTier}` : ""}`, `${Number(x.balance).toLocaleString()} · ${x.syncState}`]} />) : <Row cells={["No balances", ""]} />}
      </Section>

      <Section title={`Credits (${data.credits.length})`}>
        {data.credits.length ? data.credits.map((c, i) => <Row key={i} cells={[`${c.source} · ${date(c.createdAt)}`, `${money(c.amount)} · exp ${date(c.expiresAt)}`]} />) : <Row cells={["No credits", ""]} />}
      </Section>

      <Section title={`Sync history (${data.syncRuns.length})`}>
        {data.syncRuns.length ? data.syncRuns.map((r, i) => <Row key={i} cells={[`${date(r.startedAt)} · ${r.mailbox}`, `${r.balancesUpdated} updated · ${r.balancesVerified} verified`]} />) : <Row cells={["No syncs", ""]} />}
      </Section>

      <Section title={`Tickets (${data.tickets.length})`}>
        {data.tickets.length ? data.tickets.map((t) => <Row key={t.reference} cells={[`${t.reference} · ${t.subject}`, `${t.status} · ${t.urgency}`]} />) : <Row cells={["No tickets", ""]} />}
      </Section>

      <Section title={`Recent events (${data.events.length})`}>
        {data.events.length ? data.events.map((e, i) => <Row key={i} cells={[e.type, date(e.createdAt)]} />) : <Row cells={["No events", ""]} />}
      </Section>
    </div>
  );
}
