// components/search/FlightItinerary.jsx — full segment timeline for one slice: each leg shows departure
// and arrival times + airports, the operating flight (carrier, number, aircraft, cabin, duration), and a
// layover row between connecting legs, plus the slice total.
import { fmtTime, fmtDur, msBetween, layovers, sliceDurationMs, stopsLabel } from "./flightFormat";

export default function FlightItinerary({ slice, cabin }) {
  const segments = slice?.segments || [];
  if (!segments.length) return null;
  const lays = layovers(segments);

  return (
    <div>
      {segments.map((seg, i) => (
        <div key={i}>
          <Segment seg={seg} cabin={cabin} />
          {i < segments.length - 1 && <Layover airport={lays[i]?.airport} ms={lays[i]?.ms} />}
        </div>
      ))}
      <p className="text-[11px] text-ink-300 mt-2 tabular-nums">
        Total {fmtDur(sliceDurationMs(slice))} · {stopsLabel(slice?.stops ?? segments.length - 1)}
      </p>
    </div>
  );
}

// Each row owns its own time + rail cell + content, so the time and dot always line up with their airport
// row regardless of how tall the text wraps.
function Segment({ seg, cabin }) {
  return (
    <div>
      {/* Departure */}
      <Row time={fmtTime(seg.departure)} rail={<Dot open />}>
        <Endpoint pt={seg.origin} />
      </Row>
      {/* Flight meta (rail line connects the two dots) */}
      <Row rail={<span className="w-px flex-1 bg-ink-900/[0.15] min-h-[20px]" />}>
        <p className="text-[11px] text-ink-300 leading-relaxed py-0.5">
          <span className="font-semibold text-ink-600">{seg.carrier}</span> {seg.flightNumber}
          {seg.aircraft ? ` · ${seg.aircraft}` : ""}
          {cabin ? ` · ${cabin}` : ""} · {fmtDur(msBetween(seg.departure, seg.arrival))}
        </p>
      </Row>
      {/* Arrival */}
      <Row time={fmtTime(seg.arrival)} rail={<Dot />}>
        <Endpoint pt={seg.destination} />
      </Row>
    </div>
  );
}

// A single timeline row: [time] [rail] [content], vertically aligned.
function Row({ time, rail, children }) {
  return (
    <div className="flex items-stretch gap-3">
      <span className="w-11 flex-shrink-0 text-right text-[13px] font-semibold text-ink-900 tabular-nums pt-0.5">
        {time || ""}
      </span>
      <span className="w-2 flex-shrink-0 flex flex-col items-center pt-1.5">{rail}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function Dot({ open }) {
  return <span className={`w-2 h-2 rounded-full ${open ? "border-2 border-bonza" : "bg-bonza"}`} />;
}

function Endpoint({ pt }) {
  if (!pt) return null;
  return (
    <p className="text-[13px] text-ink-900">
      <span className="font-semibold">{pt.code}</span>
      <span className="text-ink-300"> · {[pt.city, pt.name].filter((v) => v && v !== pt.code).join(" · ") || pt.code}</span>
    </p>
  );
}

function Layover({ airport, ms }) {
  return (
    <div className="flex items-center gap-2 my-2 ml-[60px]">
      <span className="h-px flex-1 bg-ink-900/[0.08]" />
      <span className="text-[11px] font-semibold text-bonza-dark bg-[#FBE8E0] px-2.5 py-1 rounded-full tabular-nums whitespace-nowrap">
        {fmtDur(ms)} layover{airport ? ` · ${airport.city || airport.code} (${airport.code})` : ""}
      </span>
      <span className="h-px flex-1 bg-ink-900/[0.08]" />
    </div>
  );
}
