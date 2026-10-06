// components/support/BookingBoundary.jsx — Phase 22 §22e. Shown for a booking that completed on the programme's
// own site (confirmationMethod ≠ 'duffel'): Bonza can't see/change/cancel it. Shows the programme's contact +
// manage links, never offers to contact them on the user's behalf, and always offers the explanatory "Ask Bonza"
// path. Reused on the contact flow and the /bookings detail. Props: { booking, onAskBonza }.
import { useEffect, useState } from "react";
import { getProgrammeContact, apiErrorMessage } from "../../utils/api";
import Icon from "./icons";

const PROGRAMME_FROM_BOOKING = (b) => b.pointsProgramme || b.supplier;

export default function BookingBoundary({ booking, onAskBonza }) {
  const [contact, setContact] = useState(null);
  const [error, setError] = useState(null);
  const prog = PROGRAMME_FROM_BOOKING(booking);
  const pointsLabel = booking.pointsUsed ? `${Number(booking.pointsUsed).toLocaleString()} points` : "your points";

  useEffect(() => {
    if (!prog) return;
    getProgrammeContact(prog).then(setContact).catch((e) => setError(apiErrorMessage(e)));
  }, [prog]);

  const name = contact?.displayName || booking.supplier || "the programme";
  const initial = (name[0] || "?").toUpperCase();

  return (
    <div className="rounded-2xl border border-[#e6e1d8] bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#F2EFEA] text-[15px] font-bold text-ink">{initial}</span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-ink">This booking is with {name}</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
            You redeemed {pointsLabel} on {name}&rsquo;s site, so the booking belongs to them. Bonza can&rsquo;t see, change or
            cancel it — only {name} can.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-cream px-4 py-3 tabular-nums">
        <p className="text-[14px] font-bold text-ink">{name}</p>
        {contact?.phoneUk ? (
          <p className="mt-0.5 flex items-center gap-2 text-[13px] text-ink-soft">
            <Icon name="phone" size={14} /> {contact.phoneUk}
            {contact.hoursNote ? <span className="text-ink-muted">· {contact.hoursNote}</span> : null}
          </p>
        ) : (
          <p className="mt-0.5 text-[12.5px] text-ink-muted">Use the links below to reach {name}.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {contact?.manageUrl && (
            <a href={contact.manageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#141210] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#332B25]">
              Manage this booking <Icon name="external" size={13} />
            </a>
          )}
          {contact?.contactUrl && (
            <a href={contact.contactUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3ded6] bg-white px-3 py-2 text-[13px] font-semibold text-ink hover:border-bonza hover:text-bonza">
              Contact {name} <Icon name="external" size={13} />
            </a>
          )}
        </div>
        {error && <p className="mt-2 text-[12px] text-amber-600">Couldn&rsquo;t load contact details — try the programme&rsquo;s website.</p>}
      </div>

      {/* Always offer the explanatory help — "we can't change it, but we can tell you your options". */}
      <div className="mt-4 border-t border-[#f0ebe3] pt-4">
        <p className="text-[13px] text-ink-soft">
          Need help understanding your options? We can still explain cancellation rules and what your points are worth.
        </p>
        <button
          type="button"
          onClick={onAskBonza}
          className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-bonza hover:text-bonza-dark"
        >
          Ask Bonza <Icon name="chevronRight" size={14} />
        </button>
      </div>
    </div>
  );
}
