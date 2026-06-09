// components/FilterSidebar.jsx — Contextual filters for the active grid.
// Shows hotel / flight / car filters depending on the active tab, writing into
// that tab's own filter slice (filters[activeTab]) so a hotel price cap never
// leaks into the flight grid, etc.
import { useAppStore } from "../store/appStore";

const AMENITIES = ["WiFi", "Pool", "Breakfast", "Parking", "Lounge", "Spa", "Gym"];
const LOYALTY = ["Marriott", "IHG", "Hilton"];
const AIRLINES = ["United", "Qatar", "Etihad", "Emirates", "British Airways"];
const CABINS = ["Economy", "Premium Economy", "Business", "First"];
const TIMES = ["early", "morning", "afternoon", "evening"];
const CAR_CLASSES = ["Economy", "Compact", "Midsize", "SUV", "Luxury"];
const CAR_VENDORS = ["Hertz", "Enterprise", "Alamo", "Avis", "Budget", "Sixt"];

export default function FilterSidebar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const f = useAppStore((s) => s.filters[s.activeTab]);
  const setFilters = useAppStore((s) => s.setFilters);

  const toggle = (key, value) => {
    const current = f[key] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFilters({ [key]: next });
  };

  return (
    <aside className="max-h-[640px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Filters
      </h3>

      {activeTab === "hotels" && (
        <>
          <Section title={`Max price / night — $${f.maxPrice || 300}`}>
            <input
              type="range"
              min="50"
              max="300"
              value={f.maxPrice || 300}
              onChange={(e) => setFilters({ maxPrice: Number(e.target.value) })}
              className="w-full accent-bonza"
            />
          </Section>

          <Section title="Star rating">
            {[5, 4, 3].map((star) => (
              <Check key={star} label={`${star} stars`} checked={f.stars?.includes(star) || false} onChange={() => toggle("stars", star)} />
            ))}
          </Section>

          <Section title="Amenities">
            {AMENITIES.map((a) => (
              <Check key={a} label={a} checked={f.amenities?.includes(a) || false} onChange={() => toggle("amenities", a)} />
            ))}
          </Section>

          <Section title="Loyalty programs">
            {LOYALTY.map((p) => (
              <Check key={p} label={p} checked={f.loyalty?.includes(p) || false} onChange={() => toggle("loyalty", p)} />
            ))}
          </Section>

          <Section title="Guest rating" last>
            {[
              { label: "9+ (Excellent)", value: 9 },
              { label: "8+ (Very good)", value: 8 },
              { label: "Any rating", value: null },
            ].map((opt) => (
              <Radio key={opt.label} name="rating" label={opt.label} checked={f.minRating === opt.value} onChange={() => setFilters({ minRating: opt.value })} />
            ))}
          </Section>
        </>
      )}

      {activeTab === "flights" && (
        <>
          <Section title={`Max price — $${f.maxPrice || 9000}`}>
            <input
              type="range"
              min="200"
              max="9000"
              step="100"
              value={f.maxPrice || 9000}
              onChange={(e) => setFilters({ maxPrice: Number(e.target.value) })}
              className="w-full accent-bonza"
            />
          </Section>

          <Section title="Airline">
            {AIRLINES.map((a) => (
              <Check key={a} label={a} checked={f.airlines?.includes(a) || false} onChange={() => toggle("airlines", a)} />
            ))}
          </Section>

          <Section title="Cabin class">
            {CABINS.map((c) => (
              <Radio key={c} name="cabin" label={c} checked={f.cabin === c} onChange={() => setFilters({ cabin: c })} />
            ))}
            <Radio name="cabin" label="Any cabin" checked={!f.cabin} onChange={() => setFilters({ cabin: null })} />
          </Section>

          <Section title="Departure">
            {TIMES.map((t) => (
              <Check key={t} label={t[0].toUpperCase() + t.slice(1)} checked={f.departureTime?.includes(t) || false} onChange={() => toggle("departureTime", t)} />
            ))}
          </Section>

          <Section title="Stops">
            {[
              { label: "Non-stop", value: 0 },
              { label: "1 stop", value: 1 },
              { label: "2+ stops", value: 2 },
              { label: "Any", value: null },
            ].map((opt) => (
              <Radio key={opt.label} name="stops" label={opt.label} checked={f.stops === opt.value} onChange={() => setFilters({ stops: opt.value })} />
            ))}
          </Section>

          <Section title={`Max duration — ${f.maxDuration || 18}h`} last>
            <input
              type="range"
              min="6"
              max="18"
              value={f.maxDuration || 18}
              onChange={(e) => setFilters({ maxDuration: Number(e.target.value) })}
              className="w-full accent-bonza"
            />
          </Section>
        </>
      )}

      {activeTab === "cars" && (
        <>
          <Section title={`Max price / day — $${f.maxPrice || 200}`}>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={f.maxPrice || 200}
              onChange={(e) => setFilters({ maxPrice: Number(e.target.value) })}
              className="w-full accent-bonza"
            />
          </Section>

          <Section title="Car class">
            {CAR_CLASSES.map((c) => (
              <Check key={c} label={c} checked={f.carClass?.includes(c) || false} onChange={() => toggle("carClass", c)} />
            ))}
          </Section>

          <Section title="Rental company" last>
            {CAR_VENDORS.map((v) => (
              <Check key={v} label={v} checked={f.vendors?.includes(v) || false} onChange={() => toggle("vendors", v)} />
            ))}
          </Section>
        </>
      )}
    </aside>
  );
}

function Section({ title, children, last }) {
  return (
    <div className={last ? "" : "mb-4 border-b border-slate-100 pb-4"}>
      <p className="mb-2 text-xs font-medium text-slate-700">{title}</p>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="mb-1 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-bonza" />
      <span>{label}</span>
    </label>
  );
}

function Radio({ name, label, checked, onChange }) {
  return (
    <label className="mb-1 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-bonza" />
      <span>{label}</span>
    </label>
  );
}
