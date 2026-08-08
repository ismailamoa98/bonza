// components/FilterSidebar.jsx — Contextual filters for the active grid.
// Shows hotel / flight / car filters depending on the active tab, writing into
// that tab's own filter slice (filters[activeTab]) so a hotel price cap never
// leaks into the flight grid, etc.
import { useAppStore } from "../store/appStore";

const AMENITIES = ["WiFi", "Pool", "Breakfast", "Parking", "Lounge", "Spa", "Gym"];
const PROPERTY_TYPES = ["Hotel", "Resort", "Apartment", "Boutique"];
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
    <aside className="max-h-[760px] overflow-y-auto rounded-2xl bg-white p-4 font-jakarta ring-1 ring-black/5">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        Filters
      </h3>

      {activeTab === "hotels" && (
        <>
          <Section title="Price / night">
            <PriceRange f={f} min={50} max={300} setFilters={setFilters} />
          </Section>

          <Section title="Property type">
            {PROPERTY_TYPES.map((t) => (
              <Check key={t} label={t} checked={f.propertyType?.includes(t) || false} onChange={() => toggle("propertyType", t)} />
            ))}
          </Section>

          <Section title="Star rating">
            {[5, 4, 3].map((star) => (
              <Check key={star} label={`${star} stars`} checked={f.stars?.includes(star) || false} onChange={() => toggle("stars", star)} />
            ))}
          </Section>

          <Section title="Guest rating">
            {[
              { label: "9+ (Excellent)", value: 9 },
              { label: "8+ (Very good)", value: 8 },
              { label: "Any rating", value: null },
            ].map((opt) => (
              <Radio key={opt.label} name="rating" label={opt.label} checked={f.minRating === opt.value} onChange={() => setFilters({ minRating: opt.value })} />
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

          <Section title="Booking options" last>
            <Check label="Free cancellation" checked={!!f.freeCancellation} onChange={() => setFilters({ freeCancellation: !f.freeCancellation })} />
            <Check label="Breakfast included" checked={!!f.breakfast} onChange={() => setFilters({ breakfast: !f.breakfast })} />
          </Section>
        </>
      )}

      {activeTab === "flights" && (
        <>
          <Section title="Price">
            <PriceRange f={f} min={200} max={9000} step={100} setFilters={setFilters} />
          </Section>

          <Section title="Stops">
            {[
              { label: "Non-stop", value: 0 },
              { label: "Up to 1 stop", value: 1 },
              { label: "Up to 2 stops", value: 2 },
              { label: "Any", value: null },
            ].map((opt) => (
              <Radio key={opt.label} name="maxStops" label={opt.label} checked={f.maxStops === opt.value} onChange={() => setFilters({ maxStops: opt.value })} />
            ))}
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

          <Section title="Departure time">
            {TIMES.map((t) => (
              <Check key={t} label={t[0].toUpperCase() + t.slice(1)} checked={f.departureTime?.includes(t) || false} onChange={() => toggle("departureTime", t)} />
            ))}
          </Section>

          <Section title="Arrival time">
            {TIMES.map((t) => (
              <Check key={t} label={t[0].toUpperCase() + t.slice(1)} checked={f.arrivalTime?.includes(t) || false} onChange={() => toggle("arrivalTime", t)} />
            ))}
          </Section>

          <Section title={`Max duration — ${f.maxDuration || 18}h`}>
            <input
              type="range"
              min="6"
              max="18"
              value={f.maxDuration || 18}
              onChange={(e) => setFilters({ maxDuration: Number(e.target.value) })}
              className="w-full accent-bonza"
            />
          </Section>

          <Section title="Fare options" last>
            <Check label="Refundable" checked={!!f.refundable} onChange={() => setFilters({ refundable: !f.refundable })} />
            <Check label="Bags included" checked={!!f.baggage} onChange={() => setFilters({ baggage: !f.baggage })} />
          </Section>
        </>
      )}

      {activeTab === "cars" && (
        <>
          <Section title="Price / day">
            <PriceRange f={f} min={20} max={200} step={5} setFilters={setFilters} />
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

// Dual min/max price sliders writing minPrice/maxPrice; each clamps against the
// other so the range can't invert.
function PriceRange({ f, min, max, step = 10, setFilters }) {
  const lo = f.minPrice ?? min;
  const hi = f.maxPrice ?? max;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] tabular-nums text-ink-muted">
        <span>Min ${lo}</span>
        <span>Max ${hi}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={lo}
        onChange={(e) => setFilters({ minPrice: Math.min(Number(e.target.value), hi) })}
        className="w-full accent-bonza"
      />
      <input
        type="range" min={min} max={max} step={step} value={hi}
        onChange={(e) => setFilters({ maxPrice: Math.max(Number(e.target.value), lo) })}
        className="w-full accent-bonza"
      />
    </div>
  );
}

function Section({ title, children, last }) {
  return (
    <div className={last ? "" : "mb-4 border-b border-[#f0ece5] pb-4"}>
      <p className="mb-2 text-[12px] font-semibold text-ink">{title}</p>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="mb-1 flex cursor-pointer items-center gap-2 text-[12px] text-ink-soft">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-bonza" />
      <span>{label}</span>
    </label>
  );
}

function Radio({ name, label, checked, onChange }) {
  return (
    <label className="mb-1 flex cursor-pointer items-center gap-2 text-[12px] text-ink-soft">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-bonza" />
      <span>{label}</span>
    </label>
  );
}
