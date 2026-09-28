// components/common/ProgrammeLogo.jsx — Phase 14 programme mark. Renders the brand logo when a logoUrl is
// present and loads; otherwise a clean white tile with the programme initials in its brand colour. Replaces
// the coloured dots. `programme` is a catalog/account object: { logoUrl, initials, brandColor, displayName }.
import { useState } from "react";

export default function ProgrammeLogo({ programme = {}, size = 52, radius = 15 }) {
  const [failed, setFailed] = useState(false);
  const showFallback = failed || !programme.logoUrl;

  return (
    <div
      className="bg-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-[0_1px_3px_rgba(26,22,19,0.06)]"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {showFallback ? (
        <span
          className="font-extrabold tracking-tight leading-none"
          style={{ color: programme.brandColor || "#9a9088", fontSize: size * 0.29 }}
        >
          {programme.initials || "?"}
        </span>
      ) : (
        <img
          src={programme.logoUrl}
          alt={`${programme.displayName || "Programme"} logo`}
          onError={() => setFailed(true)}
          className="object-contain"
          style={{ width: size * 0.62, height: size * 0.62 }}
        />
      )}
    </div>
  );
}
