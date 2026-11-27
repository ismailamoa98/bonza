// components/search/flightFormat.js — pure formatting helpers for the flight planner UI.
// Times are read straight off the ISO string (wall-clock at the airport) to avoid timezone shifts;
// durations/day-offsets use the date + time parts directly so mock (UTC) and Duffel (local) both work.

// "2026-09-10T08:35:00Z" -> "08:35"
export function fmtTime(iso) {
  return iso ? String(iso).slice(11, 16) : "";
}

// "2026-09-10T..." -> "Tue 10 Sep"
export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

// Milliseconds between two ISO instants.
export function msBetween(aIso, bIso) {
  return new Date(bIso).getTime() - new Date(aIso).getTime();
}

// 500_000 ms -> "8h 20m" (or "45m")
export function fmtDur(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// Whole calendar days between two ISO dates (for the "+1" arrival marker).
export function dayOffset(depIso, arrIso) {
  if (!depIso || !arrIso) return 0;
  const a = new Date(`${String(depIso).slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${String(arrIso).slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

// Duffel's public airline logo CDN, keyed by IATA code (no API key). null when we have no code.
export function airlineLogoUrl(code) {
  return code
    ? `https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/${String(code).toUpperCase()}.svg`
    : null;
}

// Up-to-2-char badge from an airline code ("BA") or name ("British Airways" -> "BA").
export function monogram(codeOrName) {
  const s = String(codeOrName || "").trim();
  if (!s) return "??";
  if (s.length <= 3 && !s.includes(" ")) return s.toUpperCase().slice(0, 2);
  const parts = s.split(/\s+/);
  return ((parts[0][0] || "") + (parts[1]?.[0] || parts[0][1] || "")).toUpperCase();
}

// Deterministic terra-cotta-family tint for the monogram background.
export function monogramColor(seed) {
  let h = 0;
  for (const ch of String(seed || "")) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return `hsl(${h % 360} 45% 45%)`;
}

// Connection layovers derived from a slice's segments: [{ airport, ms }].
export function layovers(segments = []) {
  const out = [];
  for (let i = 0; i < segments.length - 1; i++) {
    out.push({ airport: segments[i].destination, ms: msBetween(segments[i].arrival, segments[i + 1].departure) });
  }
  return out;
}

// Total journey time across a slice (first departure -> last arrival).
export function sliceDurationMs(slice) {
  const segs = slice?.segments || [];
  if (!segs.length) return 0;
  return msBetween(segs[0].departure, segs[segs.length - 1].arrival);
}

export function stopsLabel(stops) {
  return !stops ? "Direct" : `${stops} stop${stops > 1 ? "s" : ""}`;
}
