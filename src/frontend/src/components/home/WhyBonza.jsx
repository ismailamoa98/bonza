// components/home/WhyBonza.jsx — Phase 18 (§18d). Replaces the old stats strip. A centred proposition then
// a borderless capability row separated by hairline rules — no container, no unverifiable metrics. The
// numeral in each stat is terra, the unit and label ink; that is what stops the row reading as a figure list.
const STATS = [
  { value: <><em>2</em> min</>, label: "to build a full package" },
  { value: <><em>300</em>+</>, label: "airlines searched for cash fares" },
  { value: <><em>25</em>+</>, label: "loyalty programmes checked for award seats" },
  { value: <>No <em>passwords</em></>, label: "balances read from your statement emails" },
];

export default function WhyBonza() {
  return (
    <section className="bg-cream py-16">
      <div className="max-w-[1080px] mx-auto px-8">
        {/* Statement */}
        <div className="max-w-[760px] mx-auto text-center">
          <p className="text-[11px] font-bold text-bonza tracking-[2.1px] mb-[1.1rem]">WHY BONZA</p>
          <h2 className="font-display text-[2.1rem] font-semibold text-[#141210] tracking-[-0.95px] leading-[1.24] mb-[1.2rem]">
            Most people hold points in four programmes and have{" "}
            <em className="not-italic text-bonza">no idea</em> which one to spend.
          </h2>
          <p className="text-[15px] text-[#7A7269] leading-[1.65] max-w-[660px] mx-auto">
            Bonza reads your balances, checks award availability across{" "}
            <b className="text-[#141210] font-semibold">25+ programmes</b> and prices every leg both ways —
            so you can save when you least expected to.
          </p>
        </div>

        {/* Hairline separator, narrower than the row below it */}
        <div className="h-px bg-[#E6E0D6] max-w-[880px] mx-auto mt-12 mb-11" />

        {/* Capability row — borderless, vertical hairlines only. Numeral terra, unit and label ink. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 tabular-nums">
          {STATS.map((s, i) => (
            <div
              key={i}
              className={`px-[1.9rem] border-l border-[#E6E0D6] ${i === 0 ? "md:border-l-0 md:pl-0" : ""} ${
                i === STATS.length - 1 ? "md:pr-0" : ""
              }`}
            >
              <p className="text-[27px] font-bold text-[#141210] tracking-[-0.85px] leading-none mb-[9px] [&_em]:not-italic [&_em]:text-bonza">
                {s.value}
              </p>
              <p className="text-[13px] text-[#7A7269] leading-[1.45]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
