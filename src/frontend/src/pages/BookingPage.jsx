// pages/BookingPage.jsx — Step 3 (route /booking): confirm details & book.
// Left column: guest info, loyalty connect, payment, and Bonza's differentiator —
// the loyalty-earnings-on-this-booking card. Right column: a sticky package +
// price summary with the confirm CTA. Financials come from the live selected
// flight/hotel/car combination; the marketing package (when opened from the
// homepage) adds flavor (rating, hero image, program). Icons are inline SVG (no
// icon-font dep); "record booking" uses the existing conversion endpoint.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore, computeCombination, tripNights } from "../store/appStore";
import { trackConversion } from "../utils/api";
import { formatMoney, formatPoints, shortDate } from "../utils/format";
import { imageUrl } from "../data/packages";

// "JFK — New York" -> "New York".
const cityOf = (label, fallback) => (label ? String(label).split(" — ").pop() : fallback || "");
// "9.1 Excellent" -> "9.1"
const ratingNum = (rate) => (rate ? String(rate).split(/\s+/)[0] : null);

// Per-program earn valuation (pence per point) for the estimate rows.
const VPP = { marriott: 0.7, ihg: 0.5, hilton: 0.5, hyatt: 1.7, amex: 1.4, chaseUr: 1.5 };
const SHADE = { marriott: "#B0552F", ihg: "#1f7a3f", hilton: "#2563a8", hyatt: "#8a6d3b", default: "#da7756" };

export default function BookingPage() {
  const navigate = useNavigate();

  const trip = useAppStore((s) => s.trip);
  const pkg = useAppStore((s) => s.currentPackage);
  const selectedFlight = useAppStore((s) => s.selectedFlight);
  const selectedHotel = useAppStore((s) => s.selectedHotel);
  const selectedCar = useAppStore((s) => s.selectedCar);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const ratio = useAppStore((s) => s.ratio);
  const bookingLink = useAppStore((s) => s.bookingLink);
  const affiliateLinks = useAppStore((s) => s.affiliateLinks);
  const reset = useAppStore((s) => s.reset);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", countryCode: "+44", phone: "", passport: "",
    cardName: "", cardNumber: "", expiry: "", cvc: "", billing: "",
  });
  const [errors, setErrors] = useState({});
  const [booked, setBooked] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!trip || !bookingLink) {
    navigate("/", { replace: true });
    return null;
  }

  const nights = tripNights(trip);
  const totals = computeCombination(selectedFlight, selectedHotel, selectedCar, loyaltyPoints, nights, ratio);
  const cashByType = Object.fromEntries(totals.items.map((it) => [it.type, it.cash]));

  const destCity = pkg?.city || cityOf(trip.destinationLabel, trip.destination);
  const dateRange = `${shortDate(trip.checkIn)} – ${shortDate(trip.checkOut)}`;
  const rating = ratingNum(pkg?.rate) || (selectedHotel ? selectedHotel.rating : null);
  const travelers = Number(trip.numberOfTravelers) || 1;

  // Loyalty-earnings rows (mock estimates — Bonza's differentiator).
  const earnRows = [];
  if (selectedHotel) {
    const key = Object.keys(selectedHotel.loyaltyPrograms || {})[0];
    const prog = selectedHotel.loyaltyPrograms?.[key];
    if (prog) {
      const pts = prog.pointsPerNight * nights;
      const vpp = VPP[key] || 0.7;
      earnRows.push({
        key,
        name: prog.program,
        desc: `Hotel stay · ${formatPoints(pts)} pts`,
        value: Math.round((pts * vpp) / 100),
        rate: `${vpp.toFixed(1)}p/pt`,
        shade: SHADE[key] || SHADE.default,
      });
    }
  }
  if (selectedFlight) {
    const miles = Math.round((selectedFlight.basePrice || 0) * 5); // ~5 miles per £ flown
    earnRows.push({
      key: "flight",
      name: `${selectedFlight.airline} miles`,
      desc: `Flights · ${formatPoints(miles)} pts`,
      value: Math.round((miles * 1.2) / 100),
      rate: "1.2p/pt",
      shade: "#5b6770",
    });
  }
  const earnValue = earnRows.reduce((s, r) => s + r.value, 0);
  const cardLow = Math.round(totals.totalCash * 0.01);
  const cardHigh = Math.round(totals.totalCash * 0.03);
  const totalEarnLow = earnValue + cardLow;
  const totalEarnHigh = earnValue + cardHigh;
  const connected = Boolean(loyaltyPoints);

  // ── Confirm & book ──────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.cardName.trim()) e.cardName = "Required";
    if (form.cardNumber.replace(/\s/g, "").length < 12) e.cardNumber = "Enter your card number";
    if (!/^\d\d\s*\/\s*\d\d$/.test(form.expiry.trim())) e.expiry = "MM / YY";
    if (form.cvc.trim().length < 3) e.cvc = "CVC";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const confirm = () => {
    if (!validate()) return;
    // Record the booking + affiliate click for each selected segment.
    totals.items.forEach((it) => {
      const link = affiliateLinks?.[it.type];
      if (!link) return;
      trackConversion(bookingLink.token, it.type, {
        vendor: link.vendor,
        commissionAmount: Math.round(it.cash * (link.commissionRate || 0)),
      }).catch(() => {});
    });
    // Hand off to each provider (per-type affiliate links).
    ["flight", "hotel", "car"].forEach((t) => {
      const url = affiliateLinks?.[t]?.affiliateUrl;
      if (url && cashByType[t] != null) window.open(url, "_blank", "noopener");
    });
    setBooked(true);
  };

  const goHome = () => {
    reset();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-cream font-jakarta text-ink">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Page header: wordmark + step indicator */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">Bonza</span>
          <Steps />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── Left column ─────────────────────────────────────────── */}
          <div className="space-y-5">
            {booked ? (
              <SuccessCard onHome={goHome} />
            ) : (
              <>
                {/* Card 1 — Guest information */}
                <Card icon="user" title="Guest information">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First name" error={errors.firstName}>
                      <input className={inputCls(errors.firstName)} value={form.firstName} onChange={set("firstName")} placeholder="Jordan" />
                    </Field>
                    <Field label="Last name" error={errors.lastName}>
                      <input className={inputCls(errors.lastName)} value={form.lastName} onChange={set("lastName")} placeholder="Rivera" />
                    </Field>
                  </div>
                  <Field label="Email address" error={errors.email}>
                    <input type="email" className={inputCls(errors.email)} value={form.email} onChange={set("email")} placeholder="jordan@email.com" />
                  </Field>
                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <Field label="Code">
                      <select className={inputCls()} value={form.countryCode} onChange={set("countryCode")}>
                        {["+44", "+1", "+33", "+34", "+49", "+971"].map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Phone number">
                      <input className={inputCls()} value={form.phone} onChange={set("phone")} placeholder="7700 900123" />
                    </Field>
                  </div>
                  <Field label="Passport number" hint="optional — speeds up check-in">
                    <input className={inputCls()} value={form.passport} onChange={set("passport")} placeholder="123456789" />
                  </Field>
                </Card>

                {/* Card 2 — Loyalty account */}
                <Card icon="star" title="Loyalty account">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-cream p-4">
                    <div>
                      <p className="text-[13px] font-bold text-ink">Earn {pkg?.loyalty || earnRows[0]?.name || "loyalty"} points</p>
                      <p className="mt-0.5 text-[12px] text-ink-soft">
                        Bonza books direct — connect your account to earn all status perks and points.
                      </p>
                    </div>
                    {connected ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#EAF6EE] px-3 py-1.5 text-[12px] font-bold text-[#1E7E40]">
                        <Icon name="check" className="h-3.5 w-3.5" /> Connected
                      </span>
                    ) : (
                      <button type="button" onClick={() => console.log("connect loyalty")} className="shrink-0 rounded-lg border border-bonza px-3.5 py-1.5 text-[12px] font-semibold text-bonza hover:bg-bonza-50">
                        Connect
                      </button>
                    )}
                  </div>
                </Card>

                {/* Card 3 — Payment */}
                <Card icon="card" title="Payment">
                  <Field label="Name on card" error={errors.cardName}>
                    <input className={inputCls(errors.cardName)} value={form.cardName} onChange={set("cardName")} placeholder="Jordan Rivera" />
                  </Field>
                  <Field label="Card number" error={errors.cardNumber}>
                    <div className="relative">
                      <input className={`${inputCls(errors.cardNumber)} pr-10`} value={form.cardNumber} onChange={set("cardNumber")} placeholder="4242 4242 4242 4242" inputMode="numeric" />
                      <Icon name="card" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Expiry" error={errors.expiry}>
                      <input className={inputCls(errors.expiry)} value={form.expiry} onChange={set("expiry")} placeholder="MM / YY" />
                    </Field>
                    <Field label="CVC" error={errors.cvc}>
                      <input className={inputCls(errors.cvc)} value={form.cvc} onChange={set("cvc")} placeholder="123" inputMode="numeric" />
                    </Field>
                  </div>
                  <Field label="Billing address">
                    <input className={inputCls()} value={form.billing} onChange={set("billing")} placeholder="221B Baker Street, London" autoComplete="street-address" />
                  </Field>
                </Card>

                {/* Card 4 — Loyalty earnings on this booking */}
                <Card icon="trophy" title="Loyalty earnings on this booking">
                  <div className="space-y-2.5">
                    {earnRows.map((r) => (
                      <div key={r.key} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: r.shade }}>
                          <Icon name="trophy" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-ink">{r.name}</p>
                          <p className="text-[12px] tabular-nums text-ink-muted">{r.desc}</p>
                        </div>
                        <div className="text-right tabular-nums">
                          <p className="text-[13px] font-bold text-ink">~{formatMoney(r.value)}</p>
                          <p className="text-[11px] text-ink-muted">{r.rate}</p>
                        </div>
                      </div>
                    ))}
                    {connected && (
                      <div className="flex items-center gap-3 border-t border-[#f0ece5] pt-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink/80 text-white">
                          <Icon name="card" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-ink">Card spend</p>
                          <p className="text-[12px] tabular-nums text-ink-muted">1%–3% on card spend</p>
                        </div>
                        <p className="text-right text-[13px] font-bold tabular-nums text-ink">
                          {formatMoney(cardLow)}–{formatMoney(cardHigh)} est.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[#f0ece5] pt-3">
                    <span className="text-[13px] font-medium text-ink-soft">Total estimated earnings</span>
                    <span className="text-[15px] font-extrabold tabular-nums text-bonza">
                      {formatMoney(totalEarnLow)}–{formatMoney(totalEarnHigh)}
                    </span>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* ── Right column: sticky summary ───────────────────────── */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(40,30,20,0.04),0_16px_40px_rgba(120,80,50,0.07)] ring-1 ring-black/5">
              {/* Hero strip */}
              <div className="relative h-28 w-full overflow-hidden" style={{ background: pkg?.grad || "linear-gradient(135deg,#E8956B,#C25E36)" }}>
                <img src={imageUrl(pkg?.query || destCity, 7)} alt={destCity} className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {rating && (
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#1f7a3f]">
                    <Icon name="star" solid className="h-2.5 w-2.5" /> {rating}
                  </span>
                )}
                <div className="absolute bottom-2 left-3 right-3 text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
                  <p className="text-[15px] font-extrabold leading-tight">{destCity}</p>
                  <p className="text-[11px] tabular-nums text-white/90">{dateRange}</p>
                </div>
              </div>

              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Your package</p>
                <dl className="mt-2 divide-y divide-[#f0ece5] text-[13px]">
                  {selectedFlight && <SummaryRow icon="plane" text={`${trip.origin} → ${trip.destination} · return`} />}
                  {selectedHotel && <SummaryRow icon="building" text={`${selectedHotel.stars}-star · ${selectedHotel.city}`} />}
                  {selectedCar && <SummaryRow icon="car" text={`${selectedCar.carClass} · ${nights} days`} />}
                  <SummaryRow icon="users" text={`${travelers} adult${travelers === 1 ? "" : "s"}`} />
                </dl>

                {/* Price breakdown */}
                <div className="mt-4 rounded-xl bg-cream p-3.5 text-[13px] tabular-nums">
                  {selectedFlight && <PriceRow label="Flight" value={formatMoney(cashByType.flight || 0)} />}
                  {selectedHotel && <PriceRow label={`Hotel (${nights} nts)`} value={formatMoney(cashByType.hotel || 0)} />}
                  {selectedCar && <PriceRow label="Car rental" value={formatMoney(cashByType.car || 0)} />}
                  {totals.savingsAmount > 0 && <PriceRow label="Package saving" value={`−${formatMoney(totals.savingsAmount)}`} accent />}
                  <div className="mt-2 flex items-center justify-between border-t border-[#e6ddd2] pt-2">
                    <span className="text-[13px] font-bold text-ink">Total</span>
                    <span className="text-xl font-extrabold text-bonza">{formatMoney(totals.totalCash)}</span>
                  </div>
                </div>

                {/* Trust chips 2×2 */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <TrustChip icon="lock" title="Books direct" text="Earn all status perks with the hotel." />
                  <TrustChip icon="shield" title="Secure payment" text="Bank-level encryption." />
                  <TrustChip icon="refresh" title="Free cancellation" text="Up to 48h before check-in." />
                  <TrustChip icon="headset" title="24/7 support" text="Bonza team on call." />
                </div>

                {!booked && (
                  <button type="button" onClick={confirm} className="mt-4 w-full rounded-lg bg-bonza px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-bonza-dark">
                    Confirm and book — {formatMoney(totals.totalCash)}
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Small building blocks ───────────────────────────────────────────────────
function Card({ icon, title, children }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(40,30,20,0.04),0_16px_40px_rgba(120,80,50,0.07)] ring-1 ring-black/5">
      <h2 className="mb-4 flex items-center gap-2 text-[15px] font-extrabold text-ink">
        <Icon name={icon} className="h-4 w-4 text-bonza" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
        {label}
        {hint && <span className="font-medium normal-case tracking-normal text-ink-muted/80">· {hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] font-medium text-bonza-dark">{error}</span>}
    </label>
  );
}

const inputCls = (error) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-bonza/30 ${
    error ? "border-bonza-dark" : "border-[#e0d9cf] focus:border-bonza"
  }`;

function SummaryRow({ icon, text }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <Icon name={icon} className="h-4 w-4 shrink-0 text-bonza" />
      <span className="tabular-nums text-ink-soft">{text}</span>
    </div>
  );
}

function PriceRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-ink-soft">{label}</span>
      <span className={accent ? "font-bold text-[#1E7E40]" : "font-semibold text-ink"}>{value}</span>
    </div>
  );
}

function TrustChip({ icon, title, text }) {
  return (
    <div className="rounded-xl bg-cream p-2.5">
      <p className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
        <Icon name={icon} className="h-3.5 w-3.5 text-bonza" />
        {title}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{text}</p>
    </div>
  );
}

function SuccessCard({ onHome }) {
  return (
    <section className="animate-dropin rounded-2xl bg-white p-8 text-center shadow-[0_1px_2px_rgba(40,30,20,0.04),0_16px_40px_rgba(120,80,50,0.07)] ring-1 ring-black/5 motion-reduce:animate-none">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF6EE] text-[#1E7E40]">
        <Icon name="check" className="h-7 w-7" />
      </span>
      <h2 className="mt-4 font-display text-[26px] font-bold text-ink">Your trip is booked.</h2>
      <p className="mt-1 text-[14px] text-ink-soft">Check your email for confirmation.</p>
      <button type="button" onClick={onHome} className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-bonza hover:text-bonza-dark">
        Return home
        <Icon name="arrow" className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}

function Steps() {
  const STEPS = [["Search", true], ["Optimise", true], ["Book", false]];
  return (
    <nav className="flex items-center gap-2 text-[12px]">
      {STEPS.map(([label, done], i) => (
        <div key={label} className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${i < 2 || !done ? "" : ""} ${done || i === 2 ? "bg-bonza text-white" : "bg-[#e7e1d8] text-ink-muted"}`}>
              {done ? <Icon name="check" className="h-2.5 w-2.5" /> : i + 1}
            </span>
            <span className={`font-medium ${i === 2 ? "text-bonza" : "text-ink-soft"}`}>{label}</span>
          </span>
          {i < 2 && <span className="h-px w-4 bg-[#e0d9cf]" />}
        </div>
      ))}
    </nav>
  );
}

// ── Inline SVG icon set (replaces the spec's Tabler icon font) ───────────────
const ICONS = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 12 0v1" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></>,
  plane: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 4.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
  building: <><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01M9 12v.01M9 15v.01" /></>,
  car: <><path d="M5 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /><path d="M5 17H3v-6l2-5h9l4 5h3a2 2 0 0 1 2 2v4h-2M7 17h8" /></>,
  users: <><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0 1 11-3M16 4a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5.6" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><polyline points="9 12 11 14 15 10" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><polyline points="21 3 21 8 16 8" /></>,
  headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2zM20 14a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2zM18 20a4 4 0 0 1-4 3h-2" /></>,
  star: <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />,
  check: <polyline points="20 6 9 17 4 12" />,
  arrow: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
};

function Icon({ name, className, solid = false }) {
  const fillIcon = solid || name === "star";
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fillIcon ? "currentColor" : "none"}
      stroke={fillIcon ? "none" : "currentColor"}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
