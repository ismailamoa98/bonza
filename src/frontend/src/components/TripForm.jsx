// components/TripForm.jsx — The functional trip-details form.
// Decoupled and prop-driven so the public homepage can feed it mock/auto-filled
// data today, and a logged-in page can feed real searches + live Plaid balances
// later. Props: { loyaltyPoints, onSubmit, loading, initial }.
//   onSubmit(form) receives the assembled trip { origin, originLabel, destination,
//   destinationLabel, checkIn, checkOut, budget, numberOfTravelers, flexibility,
//   style } — the parent decides where it goes (optimize vs flexible chooser).
import { useMemo, useState } from "react";
import AirportDropdown from "./AirportDropdown";
import LoyaltyCard from "./LoyaltyCard";

const TRAVEL_STYLES = ["Business", "Luxury", "Points Max", "Budget", "Family"];

const today = new Date().toISOString().slice(0, 10);

export default function TripForm({ loyaltyPoints, onSubmit, loading = false, initial = null }) {
  const [form, setForm] = useState({
    origin: initial?.origin || "",
    originLabel: initial?.originLabel || "",
    destination: initial?.destination || "",
    destinationLabel: initial?.destinationLabel || "",
    checkIn: initial?.checkIn || "",
    checkOut: initial?.checkOut || "",
    budget: initial?.budget || "",
    numberOfTravelers: initial?.numberOfTravelers || 2,
    flexibility: initial?.flexibility || false,
    style: initial?.preferences?.style || "Points Max",
  });

  const update = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Budget is optional (blank = optimize within points, no cash ceiling).
  // Flexible trips don't need fixed dates — Bonza shops them across months.
  const valid = useMemo(() => {
    const core = form.origin && form.destination;
    return form.flexibility ? core : core && form.checkIn && form.checkOut;
  }, [form]);

  const submit = (e) => {
    e.preventDefault();
    if (!valid || loading) return;
    onSubmit(form);
  };

  const buttonLabel = loading
    ? "Optimizing…"
    : form.flexibility
      ? "🔍 Find my best month"
      : "🔍 Find my best trip";

  return (
    <form onSubmit={submit}>
      {/* Blends into the cream background; the white inputs carry the structure. */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <AirportDropdown
          label="From"
          placeholder="London (LHR)"
          displayLabel={form.originLabel}
          onSelect={(a) =>
            setForm((f) => ({ ...f, origin: a.code, originLabel: `${a.code} — ${a.city}` }))
          }
        />
        <AirportDropdown
          label="To"
          placeholder="Anywhere"
          displayLabel={form.destinationLabel}
          onSelect={(a) =>
            setForm((f) => ({ ...f, destination: a.code, destinationLabel: `${a.code} — ${a.city}` }))
          }
        />
        <Field label="Depart">
          <input
            required={!form.flexibility}
            disabled={form.flexibility}
            type="date"
            min={today}
            value={form.checkIn}
            onChange={update("checkIn")}
            className={form.flexibility ? disabledInputClass : inputClass}
          />
        </Field>
        <Field label="Return">
          <input
            required={!form.flexibility}
            disabled={form.flexibility}
            type="date"
            min={form.checkIn || today}
            value={form.checkOut}
            onChange={update("checkOut")}
            className={form.flexibility ? disabledInputClass : inputClass}
          />
        </Field>
        <Field label="Budget (optional)">
          <input
            type="number"
            min="0"
            value={form.budget}
            onChange={update("budget")}
            placeholder="No limit"
            className={inputClass}
          />
        </Field>
        <Field label="Travelers">
          <input
            type="number"
            min="1"
            value={form.numberOfTravelers}
            onChange={update("numberOfTravelers")}
            className={inputClass}
          />
        </Field>
      </div>

      <label className="mt-3 flex items-center gap-2 text-[13px] text-ink-soft">
        <input
          type="checkbox"
          checked={form.flexibility}
          onChange={update("flexibility")}
          className="h-4 w-4 rounded border-[#d8d2c8] accent-bonza"
        />
        My dates are flexible
        {form.flexibility && (
          <span className="text-[12px] text-ink-muted">— Bonza finds the best month</span>
        )}
      </label>

      {/* Travel-style pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {TRAVEL_STYLES.map((style) => {
          const active = form.style === style;
          return (
            <button
              key={style}
              type="button"
              onClick={() => setForm((f) => ({ ...f, style }))}
              className={[
                "rounded-full border-[1.5px] px-3 py-1 text-[12px] font-medium transition-colors",
                active
                  ? "border-bonza bg-bonza text-white"
                  : "border-[#e3ded6] bg-white text-ink-soft hover:border-bonza hover:text-bonza",
              ].join(" ")}
            >
              {style}
            </button>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={loading || !valid}
        className="mt-4 w-full rounded-xl bg-bonza py-2.5 text-[14px] font-semibold text-white shadow-[0_6px_18px_rgba(218,119,86,0.25)] hover:bg-bonza-dark disabled:opacity-50"
      >
        {buttonLabel}
      </button>

      {/* Loyalty balance — the user's real points summary (Plaid mock). */}
      <div className="mt-4">
        <LoyaltyCard loyaltyPoints={loyaltyPoints} />
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#e3ded6] bg-white px-3 py-1.5 text-[13px] text-ink focus:border-bonza focus:outline-none";

const disabledInputClass =
  "w-full cursor-not-allowed rounded-lg border border-[#ece7df] bg-[#f3f1ec] px-3 py-1.5 text-[13px] text-ink-muted";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
