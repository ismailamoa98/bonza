// components/hero/DestinationBand.jsx — Phase 17 (§17h). A cream band directly beneath the hero, tracking
// the destination on screen (shared index, lifted to HomePage). One card per hotel programme, each pricing
// the whole trip two ways: all cash (return flight + whole-stay hotel, with 3% Bonza Credits), and points +
// cash (hotel on points, flight still in cash) with the hotel outlay it saves. Factual — no cents-per-point
// and no strategy/"best value" labels; the frontend only adds finished figures. Inline SVG icons (no webfont).
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ProgrammeLogo from "../common/ProgrammeLogo";
import { buildSearchUrl, openSearch } from "../../utils/searchUrl";

// Turn a display month ("May 2026") + nights into concrete check-in/out dates for the search. Anchors
// mid-month (the 12th) so the range never spills into the next month; the search treats these as the trip.
function tripDates(travelMonth, nights) {
  if (!travelMonth) return {};
  const [monthName, year] = travelMonth.split(" ");
  const start = new Date(`${monthName} 12, ${year}`);
  if (Number.isNaN(start.getTime())) return {};
  const end = new Date(start);
  end.setDate(end.getDate() + (nights || 5));
  const fmt = (d) => d.toISOString().split("T")[0];
  return { departureDate: fmt(start), returnDate: fmt(end) };
}

export default function DestinationBand({ destination, index, total, isAuthenticated, onGoTo, onStep }) {
  const navigate = useNavigate();
  const [fading, setFading] = useState(false);
  const [shown, setShown] = useState(destination);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Cross-fade content when the slide changes — the band never hard-swaps. Reduced motion swaps instantly.
  useEffect(() => {
    if (!destination || destination.slug === shown?.slug) return undefined;
    if (reduceMotion.current) {
      setShown(destination);
      return undefined;
    }
    setFading(true);
    const t = setTimeout(() => {
      setShown(destination);
      setFading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [destination, shown]);

  if (!shown?.awards?.length) return null;

  const { tagline, name, originCode, destCode, routeLabel, nights, adults, travelMonth, awards } = shown;

  // Signed in → search this exact holiday (origin, destination, party, month). Signed out → sign up first.
  const goToBestOption = () => {
    if (!isAuthenticated) {
      navigate("/sign-up");
      return;
    }
    const { departureDate, returnDate } = tripDates(travelMonth, nights);
    // Open the results in a new tab so the homepage stays put behind it.
    openSearch(
      buildSearchUrl({
        origin: originCode,
        destination: destCode,
        departureDate,
        returnDate,
        travelers: adults,
        style: "points_max",
      })
    );
  };

  return (
    <section className="bg-cream" aria-label="Trip cost by programme — cash or points">
      <div className="max-w-[1060px] mx-auto px-9 pt-6 pb-7 tabular-nums">
        {/* Header — destination left, navigation right */}
        <div className="flex items-end justify-between gap-8 mb-[1.15rem]">
          <div className={`transition-opacity duration-[400ms] ${fading ? "opacity-0" : "opacity-100"}`}>
            <h2 className="text-[17px] font-bold text-[#141210] tracking-[-0.4px] mb-1">
              {tagline || name}
            </h2>
            <p className="text-[13px] text-[#8A8078] flex flex-wrap items-center gap-2">
              {routeLabel}
              <span className="w-[3px] h-[3px] rounded-full bg-[#D6CEC4]" />
              {nights} nights, {adults} adults
              {travelMonth && (
                <>
                  <span className="w-[3px] h-[3px] rounded-full bg-[#D6CEC4]" />
                  {travelMonth}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-[0.7rem] flex-shrink-0">
            {/* Progress bars — the active one widens rather than filling. Clickable. */}
            <div className="flex gap-1">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onGoTo(i)}
                  aria-label={`Show destination ${i + 1} of ${total}`}
                  aria-current={i === index}
                  className={`h-[2.5px] rounded-sm transition-all duration-200 ${
                    i === index ? "w-[26px] bg-bonza" : "w-[18px] bg-[#E5DFD6]"
                  }`}
                />
              ))}
            </div>
            {/* Prev/next — hidden 768–1023px (bars still tap), shown at lg+. */}
            <button
              type="button"
              onClick={() => onStep(-1)}
              aria-label="Previous destination"
              className="hidden lg:flex w-8 h-8 rounded-full border border-[#E5DFD6] bg-white items-center justify-center text-[#6B635B] hover:border-[#C9C0B4] hover:text-[#141210] hover:bg-[#FAF8F5] transition-all"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onStep(1)}
              aria-label="Next destination"
              className="hidden lg:flex w-8 h-8 rounded-full border border-[#E5DFD6] bg-white items-center justify-center text-[#6B635B] hover:border-[#C9C0B4] hover:text-[#141210] hover:bg-[#FAF8F5] transition-all"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Each card shows the whole trip two ways: all cash, then the hotel on points with the flight still
            in cash. Cards fade together on slide change. */}
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-3 transition-opacity duration-[400ms] ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {awards.map((a) => (
            <div
              key={a.programme}
              className="bg-white rounded-[15px] px-[1.2rem] py-[1.05rem] shadow-[0_1px_3px_rgba(26,22,19,0.05)]"
            >
              {/* Hotel header */}
              <div className="flex items-center gap-[0.8rem] mb-[0.95rem]">
                <ProgrammeLogo programme={{ ...a, displayName: a.programmeName }} size={38} radius={11} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold text-[#141210] tracking-[-0.15px] mb-0.5 leading-[1.2]">
                    {a.propertyName}
                  </p>
                  <p className="text-[11px] text-[#8A8078]">{a.programmeName}</p>
                </div>
              </div>

              {/* Row 1 — all cash (return flight + whole-stay hotel), with 3% Bonza Credits. */}
              <PriceRow
                icon={<CashIcon />}
                iconColor="#1B7040"
                label="All cash"
                sub="flight + hotel"
                value={`£${a.allCash.toLocaleString()}`}
                note={`+ £${a.creditsIfCash.toFixed(2)} credits`}
                noteColor="#da7756"
              />

              {/* Row 2 — hotel on points, flight still in cash. */}
              <PriceRow
                icon={<SwapIcon />}
                iconColor="#6B4FA5"
                label="Points + cash"
                sub="hotel on points, fly cash"
                value={
                  <>
                    {a.hybridPoints.toLocaleString()}
                    <span className="text-[11px] font-semibold text-[#8A8078] mx-0.5">+</span>£
                    {a.hybridCash.toLocaleString()}
                  </>
                }
                note={
                  a.userCanAfford === true
                    ? "your balance covers this"
                    : `saves £${a.hybridSaves.toLocaleString()}`
                }
                noteColor="#1B7040"
              />
            </div>
          ))}
        </div>

        {/* Footer — names the flight cost, then teases the points upside */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mt-[1.1rem] pt-4 border-t border-[#F2EFEA]">
          <p className="text-[12.5px] text-[#8A8078] leading-[1.5]">{footerCopy(shown, isAuthenticated)}</p>
          <button
            type="button"
            onClick={goToBestOption}
            className="self-start sm:self-auto text-[13px] font-semibold text-white bg-[#141210] px-5 py-2.5 rounded-full hover:bg-[#332B25] flex items-center gap-[7px] whitespace-nowrap transition-colors"
          >
            {isAuthenticated ? "See your best option" : "Find your best option"}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

// Row icons — inline SVG (no webfont). Colour comes from the tile via currentColor.
function CashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 10H20l-3.5-3.5M17 14H4l3.5 3.5" />
    </svg>
  );
}

// One priced way to book the trip: icon + label/sub on the left, headline figure + note on the right.
function PriceRow({ icon, iconColor, label, sub, value, note, noteColor }) {
  return (
    <div className="flex items-center justify-between gap-[0.8rem] py-[0.6rem] border-t border-[rgba(26,22,19,0.07)]">
      <div className="flex items-center gap-[7px] min-w-0">
        <span
          className="w-[22px] h-[22px] rounded-[7px] bg-[#F4F2ED] flex items-center justify-center flex-shrink-0"
          style={{ color: iconColor }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold text-[#4A423B] whitespace-nowrap">{label}</p>
          <p className="text-[10px] text-[#A69C92] mt-px whitespace-nowrap">{sub}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[14px] font-bold text-[#141210] tracking-[-0.3px]">{value}</p>
        <p className="text-[10px] font-semibold mt-px" style={{ color: noteColor }}>
          {note}
        </p>
      </div>
    </div>
  );
}

function footerCopy(d, isAuthenticated) {
  const affordable = d.awards.filter((a) => a.userCanAfford);

  if (isAuthenticated && affordable.length) {
    return (
      <>
        Your <b className="text-[#141210] font-bold">{affordable[0].programmeName}</b> balance covers the{" "}
        {affordable[0].propertyName} — you&apos;d only pay for the flight.
      </>
    );
  }
  return (
    <>
      Flights to {d.name.split(",")[0]} run{" "}
      <b className="text-[#141210] font-bold">£{d.flightCash.toLocaleString()}</b>
      {d.carrier ? ` with ${d.carrier}` : ""}. But your points could be a lot more valuable.
    </>
  );
}
