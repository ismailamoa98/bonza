// components/SearchBar.jsx — "Refine search" bar at the top of the results column.
// The single place to edit the trip on the optimize page (the left-rail summary's
// "Edit" scrolls here). On Update it resolves any typed-but-unselected airport to
// its top match (mirroring TripForm) and writes the trip back to the store, which
// re-fetches the grids.
import { useState } from "react";
import AirportDropdown from "./AirportDropdown";
import { useAppStore } from "../store/appStore";
import { getAirports } from "../utils/api";

export default function SearchBar() {
  const trip = useAppStore((s) => s.trip);
  const setTrip = useAppStore((s) => s.setTrip);

  const [form, setForm] = useState({
    origin: trip?.origin || "",
    originLabel: trip?.originLabel || "",
    destination: trip?.destination || "",
    destinationLabel: trip?.destinationLabel || "",
    checkIn: trip?.checkIn || "",
    checkOut: trip?.checkOut || "",
  });
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");

  const apply = async (e) => {
    e.preventDefault();
    let next = { ...form };
    try {
      if (!next.origin && originText.trim().length >= 2) {
        const [a] = await getAirports(originText.trim());
        if (a) next = { ...next, origin: a.code, originLabel: `${a.code} — ${a.city}` };
      }
      if (!next.destination && destText.trim().length >= 2) {
        const [a] = await getAirports(destText.trim());
        if (a) next = { ...next, destination: a.code, destinationLabel: `${a.code} — ${a.city}` };
      }
    } catch {
      // Network hiccup resolving airports — apply what we have.
    }
    setForm(next);
    setTrip({ ...trip, ...next });
  };

  return (
    <form
      id="refine"
      onSubmit={apply}
      className="relative z-20 flex scroll-mt-20 flex-wrap items-end gap-3 rounded-2xl bg-white p-3 font-jakarta ring-1 ring-black/5"
    >
      <p className="w-full text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        Refine search
      </p>
      <div className="min-w-[150px] flex-1">
        <AirportDropdown
          label="From"
          placeholder="Origin…"
          displayLabel={form.originLabel}
          onQueryChange={setOriginText}
          onSelect={(a) =>
            setForm((f) => ({ ...f, origin: a.code, originLabel: `${a.code} — ${a.city}` }))
          }
        />
      </div>
      <div className="min-w-[150px] flex-1">
        <AirportDropdown
          label="To"
          placeholder="Destination…"
          displayLabel={form.destinationLabel}
          onQueryChange={setDestText}
          onSelect={(a) =>
            setForm((f) => ({
              ...f,
              destination: a.code,
              destinationLabel: `${a.code} — ${a.city}`,
            }))
          }
        />
      </div>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-ink-soft">Depart</span>
        <input
          type="date"
          value={form.checkIn}
          onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-ink-soft">Return</span>
        <input
          type="date"
          min={form.checkIn || undefined}
          value={form.checkOut}
          onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-bonza px-4 py-2 text-sm font-semibold text-white hover:bg-bonza-dark"
      >
        Update
      </button>
    </form>
  );
}

const inputClass =
  "rounded-lg border border-[#e0d9cf] px-3 py-2 text-[13px] text-ink focus:border-bonza focus:outline-none";
