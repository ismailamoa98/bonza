// components/search/TripToggle.jsx — "Select for trip" toggle reflecting the trip-tray state.
// Used on result cards (default) and in the detail panels (variant="cta").
import { useAppStore } from "../../store/appStore";
import { CheckIcon, PlusIcon } from "./icons";

const idOf = (x) => x?.duffelHotelId || x?.duffelOfferId || x?.id;

export default function TripToggle({ type, item, variant = "chip" }) {
  const inTrip = useAppStore((s) => s.tripSelection[type]);
  const addToTrip = useAppStore((s) => s.addToTrip);
  const removeFromTrip = useAppStore((s) => s.removeFromTrip);
  const selected = inTrip && idOf(inTrip) === idOf(item);

  const onClick = (e) => {
    e.stopPropagation();
    selected ? removeFromTrip(type) : addToTrip(type, item);
  };

  if (variant === "cta") {
    return (
      <button
        onClick={onClick}
        className={`px-4 py-3 rounded-full text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
          selected
            ? "bg-[#EAF6EE] text-[#1E7E40]"
            : "bg-cream text-ink-700 border border-ink-900/[0.1] hover:border-ink-900/[0.2]"
        }`}
      >
        {selected ? <CheckIcon width="14" height="14" /> : <PlusIcon width="14" height="14" />}
        {selected ? "In trip" : "Add to trip"}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full text-[11px] font-semibold px-2.5 py-1 transition-colors ${
        selected ? "bg-[#EAF6EE] text-[#1E7E40]" : "bg-cream text-ink-600 hover:text-bonza border border-ink-900/[0.08]"
      }`}
    >
      {selected ? <CheckIcon width="12" height="12" /> : <PlusIcon width="12" height="12" />}
      {selected ? "In trip" : "Select for trip"}
    </button>
  );
}
