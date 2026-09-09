// components/points/PortfolioMetrics.jsx — the page's hero band: three headline metrics across the full
// width, split by hairline dividers and lifted onto a soft panel so it reads as the core of the page.
import { WalletIcon, ExchangeIcon, ClockIcon } from "./icons";

export default function PortfolioMetrics({ metrics, loading }) {
  if (loading || !metrics) {
    return <div className="h-[132px] rounded-2xl bg-white/50 animate-pulse mb-1" />;
  }

  const { creditBalance, transferableBalance, transferableProgrammes, expiring } = metrics;

  return (
    <div className="rounded-2xl bg-white/60 border border-ink-900/[0.06] shadow-[0_10px_40px_rgba(120,80,50,0.06)] px-2 py-7 md:py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-ink-900/[0.09]">
        <Metric
          icon={<WalletIcon width="17" height="17" />}
          label="Bonza Credits"
          value={`£${creditBalance.toFixed(2)}`}
          sub="Applied automatically at checkout"
        />
        <Metric
          icon={<ExchangeIcon width="17" height="17" />}
          label="Transferable balance"
          value={transferableBalance.toLocaleString()}
          unit="pts"
          sub={
            <>
              {transferableProgrammes.slice(0, 2).map((p, i) => (
                <span key={p}>
                  {i > 0 && " and "}
                  <strong className="text-ink-600 font-semibold">{p.split(" ")[0]}</strong>
                </span>
              ))}
              {transferableProgrammes.length > 2 && ` +${transferableProgrammes.length - 2} more`}
            </>
          }
        />
        <Metric
          icon={<ClockIcon width="17" height="17" />}
          label="Expiring soon"
          value={expiring ? expiring.balance.toLocaleString() : "—"}
          unit={expiring?.currency}
          warn={!!expiring}
          sub={
            expiring ? (
              <>
                <strong className="text-ink-600 font-semibold">{expiring.programme}</strong> ·{" "}
                {expiring.daysToExpiry} days left
              </>
            ) : (
              "Nothing expiring in the next 120 days"
            )
          }
        />
      </div>
    </div>
  );
}

function Metric({ icon, label, value, unit, sub, warn }) {
  return (
    <div className="px-6 md:px-8 py-3 md:py-1">
      <p className="text-[12px] font-medium text-ink-300 mb-3 flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            warn ? "bg-[#FBF0DC] text-[#B45309]" : "bg-bonza/[0.10] text-bonza"
          }`}
        >
          {icon}
        </span>
        {label}
      </p>
      <p
        className={`text-[36px] font-bold tracking-[-1px] leading-none flex items-baseline gap-2 tabular-nums ${
          warn ? "text-[#B45309]" : "text-ink-900"
        }`}
      >
        {value}
        {unit && <span className="text-[15px] font-medium text-ink-300 tracking-normal">{unit}</span>}
      </p>
      <p className="text-[12.5px] text-ink-300 mt-2.5">{sub}</p>
    </div>
  );
}
