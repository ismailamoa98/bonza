// components/search/AirlineLogo.jsx — genuine airline logo from Duffel's public CDN (by IATA code),
// with a colored monogram fallback when there's no code or the image fails to load.
import { useState } from "react";
import { airlineLogoUrl, monogram, monogramColor } from "./flightFormat";

export default function AirlineLogo({ code, name, size = 32 }) {
  const [failed, setFailed] = useState(false);
  const url = airlineLogoUrl(code);
  const box = { width: size, height: size };

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name || code || "Airline"}
        style={box}
        onError={() => setFailed(true)}
        className="rounded-lg object-contain bg-white ring-1 ring-ink-900/[0.06]"
      />
    );
  }

  return (
    <span
      style={{ ...box, background: monogramColor(name || code) }}
      className="rounded-lg flex items-center justify-center text-white font-bold text-[11px] tracking-tight"
      aria-label={name || code || "Airline"}
    >
      {monogram(code || name)}
    </span>
  );
}
