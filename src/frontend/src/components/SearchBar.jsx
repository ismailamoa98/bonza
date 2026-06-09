// components/SearchBar.jsx — Compact trip editor at the top of Step 2.
// Lets the user tweak origin/destination/dates in place; on "Update" it writes
// the trip back to the store, which re-fetches the hotel/flight grids.
import { useState } from "react";
import AirportDropdown from "./AirportDropdown";
import { useAppStore } from "../store/appStore";

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

  const apply = (e) => {
    e.preventDefault();
    setTrip({ ...trip, ...form });
  };

  return (
    <form
      onSubmit={apply}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3"
    >
      <div className="min-w-[150px] flex-1">
        <AirportDropdown
          label="From"
          placeholder="Origin…"
          displayLabel={form.originLabel}
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
        <span className="mb-1 block text-sm font-medium text-slate-600">Depart</span>
        <input
          type="date"
          value={form.checkIn}
          onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600">Return</span>
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
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-bonza focus:outline-none";
