// components/LegalPage.jsx — shared layout for the Privacy / Terms / Cookies stub pages. A centered prose
// column with a title, "Last updated" line, a template banner (these are DRAFTS, not legal advice), and a
// `sections` array rendered as headings + paragraphs/lists. Content is Bonza-specific but needs legal review.
// Section shape: { heading, body?: string | string[], list?: string[] }.

function Block({ text }) {
  return <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">{text}</p>;
}

export default function LegalPage({ title, updated, intro, sections = [] }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="font-display text-[32px] font-bold tracking-[-0.01em] text-ink">{title}</h1>
      {updated && <p className="mt-2 text-[13px] text-ink-muted">Last updated: {updated}</p>}

      <p className="mt-5 rounded-xl border border-[#ece7df] bg-[#FBFAF8] px-4 py-3 text-[13px] italic text-ink-muted">
        This is a draft template, not legal advice. It must be reviewed by legal counsel — and completed with
        Bonza&rsquo;s registered entity, jurisdiction and contact details — before launch.
      </p>

      {intro && <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">{intro}</p>}

      {sections.map((s) => (
        <section key={s.heading} className="mt-9">
          <h2 className="font-display text-[19px] font-semibold text-ink">{s.heading}</h2>
          {Array.isArray(s.body)
            ? s.body.map((p, i) => <Block key={i} text={p} />)
            : s.body && <Block text={s.body} />}
          {s.list && (
            <ul className="mt-3 space-y-1.5">
              {s.list.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-[14.5px] leading-relaxed text-ink-soft">
                  <span className="mt-[0.55em] h-[5px] w-[5px] flex-shrink-0 rounded-full bg-bonza" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
