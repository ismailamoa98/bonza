// components/search/PointsRedeemModal.jsx — compare-and-pick redemption menu for a hotel stay.
// Fetches the options from /optimize/hotel-options (cash · points · cash+points, cheapest recommended),
// lets the user pick, guides any points transfer (Pro) and — for a "buy the shortfall" blend — the
// buy-points step, then deep-links to the programme's own award site. Award stays can't be booked in-app,
// so the user completes it there and self-reports via PostClickPrompt, which books it to their account.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProGate from "../ProGate";
import { getHotelRedemptionOptions, pointsHandoff, confirmTransfer } from "../../utils/api";
import { formatGbp } from "../../utils/format";
import { PROGRAMME_LABELS } from "./programmes";
import { XIcon, StarIcon } from "./icons";

const label = (p) => PROGRAMME_LABELS[p] || p;
const gbp = (n) => formatGbp(Math.round(Number(n) || 0));

export default function PointsRedeemModal({ open, onClose, result, meta, programme, centsPerPoint, totalCash, onHandoff }) {
  const navigate = useNavigate();
  const [shown, setShown] = useState(false);
  const [data, setData] = useState(null); // { options, recommendedIndex, canAffordFull, programmeLabel, transfer }
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transferDone, setTransferDone] = useState(false);

  const close = () => {
    setShown(false);
    setTimeout(() => onClose?.(), 200);
  };

  useEffect(() => {
    if (!open) return;
    setShown(false);
    setData(null);
    setTransferDone(false);
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);

    setLoading(true);
    getHotelRedemptionOptions({ cashGbp: totalCash, centsPerPoint, programme })
      .then((d) => {
        setData(d);
        setSelected(d.recommendedIndex || 0);
      })
      .catch(() => setData({ options: [], recommendedIndex: 0 }))
      .finally(() => setLoading(false));

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const programmeName = data?.programmeLabel || label(programme);
  const options = data?.options || [];
  const opt = options[selected] || null;
  const usesPoints = opt && opt.method !== "cash";
  // Transfer applies when the chosen points come partly from a transferable currency (Amex/Chase).
  const needsTransfer = !!(data?.transfer && usesPoints && (opt.pointsUsed || 0) > (data.directPoints || 0));
  const transfer = data?.transfer;

  const bookCash = () => {
    const qs = new URLSearchParams({
      hotel: result?.duffelHotelId || "",
      type: "cash",
      origin: meta?.origin || "",
      destination: meta?.destination || "",
      checkIn: meta?.departureDate || "",
      checkOut: meta?.returnDate || "",
      adults: String(meta?.travelers || 1),
    });
    close();
    navigate(`/booking?${qs.toString()}`);
  };

  const doTransfer = () => {
    if (!transfer?.issuerUrl) return;
    window.open(transfer.issuerUrl, "_blank", "noopener,noreferrer");
    setTransferDone(true);
    // journeyId isn't created until handoff; record the transfer intent alongside it on continue.
  };

  const doContinue = async () => {
    if (opt?.method === "cash") return bookCash();
    setBusy(true);
    try {
      const res = await pointsHandoff({
        hotelId: result?.duffelHotelId,
        name: result?.name,
        city: result?.location?.city || result?.location || meta?.destination,
        programme,
        checkIn: meta?.departureDate,
        checkOut: meta?.returnDate,
        adults: meta?.travelers || 1,
        method: opt.method,
        pointsUsed: opt.pointsUsed,
        pointsBought: opt.pointsBought,
        buyCostGbp: opt.buyCostGbp,
        cashGbp: opt.cashPaid,
      });
      if (needsTransfer && transferDone && res.journeyId && transfer) {
        confirmTransfer(res.journeyId, {
          fromProgramme: transfer.fromProgramme,
          toProgramme: transfer.toProgramme,
          amount: Math.max(0, (opt.pointsUsed || 0) - (data.directPoints || 0)),
        }).catch(() => {});
      }
      if (res.buyPointsUrl) window.open(res.buyPointsUrl, "_blank", "noopener,noreferrer");
      if (res.awardUrl) window.open(res.awardUrl, "_blank", "noopener,noreferrer");
      const journeyId = res.journeyId;
      close();
      if (journeyId) onHandoff?.(journeyId);
    } finally {
      setBusy(false);
    }
  };

  const continueLabel = () => {
    if (!opt) return "Continue";
    if (opt.method === "cash") return `Book with cash — ${gbp(opt.cashPaid)}`;
    if (opt.pointsBought > 0) return `Buy points, then book on ${programmeName}`;
    return `Continue to ${programmeName}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Redeem with points"
        className={`relative w-full max-w-[480px] bg-white rounded-2xl shadow-2xl font-jakarta transform transition-all duration-200 ${
          shown ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <button onClick={close} aria-label="Close" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cream flex items-center justify-center text-ink-600 hover:text-ink-900 z-10">
          <XIcon width="15" height="15" />
        </button>

        <div className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-2 text-bonza mb-1">
            <StarIcon width="18" height="18" />
            <h2 className="text-[19px] font-display font-semibold text-ink-900">How to pay for {result?.name}</h2>
          </div>
          <p className="text-[12px] text-ink-300 leading-relaxed">
            Bonza compared cash against your points{transfer ? " (incl. transfers)" : ""}. Figures are
            indicative — you complete the booking on {programmeName}'s own site.
          </p>

          {loading ? (
            <div className="space-y-2 mt-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-cream rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-2">
                {options.map((o, i) => (
                  <OptionRow
                    key={o.method + i}
                    o={o}
                    programmeName={programmeName}
                    selected={i === selected}
                    recommended={i === data?.recommendedIndex}
                    onSelect={() => setSelected(i)}
                  />
                ))}
              </div>

              {needsTransfer && transfer && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold tracking-wider text-ink-300 mb-2">STEP 1 · TRANSFER POINTS</p>
                  <ProGate feature="guided points transfers">
                    <div className="rounded-xl border border-bonza/20 bg-[#FBF3EF] p-4">
                      <p className="text-[12px] text-ink-700 leading-relaxed">
                        Transfer{" "}
                        <span className="font-semibold tabular-nums">
                          {Math.max(0, (opt.pointsUsed || 0) - (data.directPoints || 0)).toLocaleString()}
                        </span>{" "}
                        from <span className="font-semibold">{label(transfer.fromProgramme)}</span> to{" "}
                        <span className="font-semibold">{label(transfer.toProgramme)}</span>
                        {transfer.ratio !== 1 ? ` (${transfer.ratio}:1)` : ""} — usually instant.
                      </p>
                      <button
                        onClick={doTransfer}
                        className={`mt-3 w-full py-2.5 rounded-full text-[12px] font-semibold transition-colors ${
                          transferDone ? "bg-[#1E7E40] text-white" : "bg-white border border-bonza text-bonza hover:bg-bonza hover:text-white"
                        }`}
                      >
                        {transferDone ? "Transfer opened — confirm on their site" : `Transfer on ${label(transfer.fromProgramme)}`}
                      </button>
                    </div>
                  </ProGate>
                </div>
              )}

              {opt?.method !== "cash" && needsTransfer && (
                <p className="text-[11px] font-bold tracking-wider text-ink-300 mt-4 mb-1">STEP 2 · BOOK THE STAY</p>
              )}
              <button
                onClick={doContinue}
                disabled={busy || !opt}
                className="mt-3 w-full py-3 bg-bonza text-white rounded-full text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Preparing…" : continueLabel()}
              </button>
              {opt?.pointsBought > 0 && (
                <p className="text-[10px] text-ink-300 text-center mt-2">
                  We'll open {programmeName}'s buy-points page first, then the award booking. Large purchases may be capped.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionRow({ o, programmeName, selected, recommended, onSelect }) {
  const title = o.method === "cash" ? "Cash only" : o.method === "points" ? "Points" : "Cash + Points";
  const detail =
    o.method === "cash"
      ? formatGbp(Math.round(o.cashPaid))
      : o.method === "points"
        ? `${o.pointsUsed.toLocaleString()} pts`
        : `${o.pointsUsed.toLocaleString()} pts${o.pointsBought > 0 ? ` + buy ${o.pointsBought.toLocaleString()}` : ""} + ${formatGbp(Math.round(o.cashPaid))}`;
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
        selected ? "border-bonza bg-[#FBEEE7]" : "border-ink-900/[0.1] bg-white hover:border-ink-900/[0.2]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selected ? "border-bonza bg-bonza" : "border-ink-300"}`} />
          <span className="text-[13px] font-semibold text-ink-900">{title}</span>
          {recommended && (
            <span className="inline-flex items-center gap-0.5 bg-bonza text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              <StarIcon width="8" height="8" /> BEST VALUE
            </span>
          )}
          {o.promo && (
            <span className="text-[9px] font-bold text-bonza bg-[#FBE8E0] rounded-full px-1.5 py-0.5">{o.promo}</span>
          )}
        </div>
        <span className="text-[13px] font-semibold text-ink-900 tabular-nums whitespace-nowrap">{detail}</span>
      </div>
    </button>
  );
}
