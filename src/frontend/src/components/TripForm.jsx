// components/TripForm.jsx — The functional trip-details form.
// Decoupled and prop-driven so the public homepage can feed it mock/auto-filled
// data today, and a logged-in page can feed real searches + live Plaid balances
// later. Props: { loyaltyPoints, onSubmit, loading, initial, variant }.
//   onSubmit(form) receives the assembled trip { origin, originLabel, destination,
//   destinationLabel, checkIn, checkOut, budget, numberOfTravelers, flexibility,
//   style } — the parent decides where it goes (optimize vs flexible chooser).
//   variant — "panel" (stacked 2×2 + full LoyaltyCard, for the dashboard/optimize
//   flow) or "bar" (single horizontal rounded pill for the cinematic hero; the
//   parent supplies the LoyaltyCard strip separately).
import { useMemo, useState } from "react";
import AirportDropdown from "./AirportDropdown";
import LoyaltyCard from "./LoyaltyCard";
import { getAirports } from "../utils/api";

const TRAVEL_STYLES = ["Business", "Luxury", "Points Max", "Budget", "Family"];

const today = new Date().toISOString().slice(0, 10);

export default function TripForm({
  loyaltyPoints,
  onSubmit,
  loading = false,
  initial = null,
  variant = "panel",
  embedded = false,
}) {
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

  // Raw typed text in the From/To fields (before a dropdown row is committed) so
  // we can resolve a typed-but-unselected airport to its top match on submit.
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");

  const update = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // The button enables once each endpoint is either selected OR typed (≥2 chars);
  // submit() resolves any typed-only field to a real airport before continuing.
  // Dates are intentionally NOT gated here: the date inputs are `required` for
  // non-flexible trips, so native HTML5 validation shows a visible prompt on an
  // empty submit instead of leaving the button silently disabled.
  const valid = useMemo(() => {
    const hasOrigin = form.origin || originText.trim().length >= 2;
    const hasDest = form.destination || destText.trim().length >= 2;
    return hasOrigin && hasDest;
  }, [form, originText, destText]);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || loading) return;

    // Resolve typed-but-unselected airports to the top match.
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
      // Network hiccup resolving airports — fall through to the guard below.
    }

    if (!next.origin || !next.destination) return; // couldn't resolve — no-op
    setForm(next);
    onSubmit(next);
  };

  const buttonLabel = loading
    ? "Optimizing…"
    : form.flexibility
      ? "Find my best month"
      : "Find my best trip";

  // Shared travel-style pills + flexible toggle (reused by both variants).
  const stylePills = (
    <div className="flex flex-wrap gap-2">
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
  );

  const flexibleToggle = (
    <label className="flex items-center gap-2 text-[13px] text-ink-soft">
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
  );

  // ── BAR variant ─────────────────────────────────────────────────────────
  // `embedded` drops the rounded-pill chrome (white bg + shadow) so the bar can
  // sit inside a card that already provides the container (dashboard).
  if (variant === "bar") {
    const rowClass = embedded
      ? "flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-0"
      : "flex flex-col gap-1 rounded-3xl bg-white p-2 shadow-[0_18px_50px_rgba(40,30,20,0.18)] sm:flex-row sm:items-center sm:rounded-full sm:gap-0";
    return (
      <form onSubmit={submit}>
        <div className={rowClass}>
          <div className="min-w-0 flex-1 px-4 py-1.5">
            <AirportDropdown
              label="From"
              placeholder="London (LHR)"
              displayLabel={form.originLabel}
              bare
              onQueryChange={setOriginText}
              onSelect={(a) =>
                setForm((f) => ({ ...f, origin: a.code, originLabel: `${a.code} — ${a.city}` }))
              }
            />
          </div>
          <Divider />
          <div className="min-w-0 flex-1 px-4 py-1.5">
            <AirportDropdown
              label="To"
              placeholder="Anywhere"
              displayLabel={form.destinationLabel}
              bare
              onQueryChange={setDestText}
              onSelect={(a) =>
                setForm((f) => ({ ...f, destination: a.code, destinationLabel: `${a.code} — ${a.city}` }))
              }
            />
          </div>
          <Divider />
          <div className="min-w-0 flex-[1.2] px-4 py-1.5">
            <BarLabel>Dates</BarLabel>
            <div className="flex items-center gap-1">
              <input
                required={!form.flexibility}
                disabled={form.flexibility}
                type="date"
                min={today}
                value={form.checkIn}
                onChange={update("checkIn")}
                className={barDateClass}
              />
              <span className="text-ink-muted">→</span>
              <input
                required={!form.flexibility}
                disabled={form.flexibility}
                type="date"
                min={form.checkIn || today}
                value={form.checkOut}
                onChange={update("checkOut")}
                className={barDateClass}
              />
            </div>
          </div>
          <Divider />
          <div className="px-4 py-1.5 sm:w-24">
            <BarLabel>Travelers</BarLabel>
            <input
              type="number"
              min="1"
              value={form.numberOfTravelers}
              onChange={update("numberOfTravelers")}
              className="w-full bg-transparent text-[14px] font-semibold text-ink focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !valid}
            aria-label="Find my best trip"
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-bonza px-5 text-[14px] font-semibold text-white hover:bg-bonza-dark disabled:opacity-50 sm:h-12 sm:w-12 sm:px-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="sm:hidden">{loading ? "Optimizing…" : "Find"}</span>
          </button>
        </div>

        {/* Secondary row: flexible toggle + travel-style pills. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {flexibleToggle}
          {stylePills}
        </div>
      </form>
    );
  }

  // ── PANEL variant (default) ─────────────────────────────────────────────
  return (
    <form onSubmit={submit}>
      {/* Blends into the cream background; the white inputs carry the structure. */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <AirportDropdown
          label="From"
          placeholder="London (LHR)"
          displayLabel={form.originLabel}
          onQueryChange={setOriginText}
          onSelect={(a) =>
            setForm((f) => ({ ...f, origin: a.code, originLabel: `${a.code} — ${a.city}` }))
          }
        />
        <AirportDropdown
          label="To"
          placeholder="Anywhere"
          displayLabel={form.destinationLabel}
          onQueryChange={setDestText}
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

      <div className="mt-3">{flexibleToggle}</div>

      {/* Travel-style pills */}
      <div className="mt-3">{stylePills}</div>

      <button
        type="submit"
        disabled={loading || !valid}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-bonza py-2.5 text-[14px] font-semibold text-white shadow-[0_6px_18px_rgba(218,119,86,0.25)] hover:bg-bonza-dark disabled:opacity-50"
      >
        {!loading && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        )}
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

const barDateClass =
  "min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-ink focus:outline-none disabled:text-ink-muted";

function Divider() {
  return <span className="hidden w-px self-stretch bg-[#ece7df] sm:block" />;
}

function BarLabel({ children }) {
  return (
    <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
      {children}
    </span>
  );
}

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
