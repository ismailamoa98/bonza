// components/search/ReviewsTab.jsx — property reviews: Bonza-analysed aspect scores (Location / Comfort /
// Facilities) on top, then two clearly-separated sections — "Bonza verified guests" (people who booked via
// the app) and "From the web" (Google, attributed). Eligible guests get an inline write-review form.
import { useEffect, useState, useCallback } from "react";
import { getReviews, submitBonzaReview } from "../../utils/api";
import { StarIcon } from "./icons";

const ASPECTS = [
  ["location", "Location"],
  ["comfort", "Comfort"],
  ["facilities", "Facilities"],
];

// Illustrative aspect scores shown only in the offline/no-key demo (clearly labelled).
const SAMPLE_ASPECTS = { location: 8.6, comfort: 8.9, facilities: 8.2, summary: "Guests love the central location and comfortable rooms.", sampleSize: 2, source: "sample" };
const SAMPLE_WEB = [
  { author: "Sofia", text: "Spotless rooms and the location couldn't be better — walkable to everything.", rating: 5, relativeTime: "sample" },
  { author: "Daniel", text: "Great value for the area. Breakfast was excellent and staff were lovely.", rating: 4, relativeTime: "sample" },
];

export default function ReviewsTab({ result, meta }) {
  const [state, setState] = useState({ loading: true });

  const load = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    const coords = result?.location?.geographic_coordinates;
    getReviews({
      name: result?.name,
      city: result?.location?.city || result?.location || meta?.destination,
      lat: coords?.latitude,
      lng: coords?.longitude,
    })
      .then((data) => !cancelled && setState({ loading: false, data }))
      .catch(() => !cancelled && setState({ loading: false, data: { google: { source: "google", matched: false }, aspects: null, bonza: [], canReview: false } }));
    return () => {
      cancelled = true;
    };
  }, [result?.name, result?.location, meta?.destination]);

  useEffect(() => load(), [load]);

  if (state.loading) {
    return (
      <div className="w-full">
        <div className="h-20 bg-cream rounded-xl mb-5 animate-pulse" />
        {[0, 1].map((i) => (
          <div key={i} className="bg-cream rounded-xl p-4 mb-3">
            <div className="h-3 w-24 bg-ink-900/[0.06] rounded mb-2" />
            <div className="h-3 w-full bg-ink-900/[0.06] rounded" />
          </div>
        ))}
      </div>
    );
  }

  const { placeId, google = {}, aspects, bonza = [], canReview } = state.data || {};
  const isMock = google.source === "mock";
  const shownAspects = aspects || (isMock ? SAMPLE_ASPECTS : null);
  const webReviews = google.matched ? google.reviews || [] : isMock ? SAMPLE_WEB : [];

  return (
    <div className="w-full">
      {/* Aspect breakdown */}
      {shownAspects && (
        <div className="bg-cream rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-ink-300 tracking-wider">WHAT GUESTS RATE</p>
            <p className="text-[10px] text-ink-300">
              {shownAspects.source === "sample"
                ? "Illustrative sample"
                : `Based on ${shownAspects.sampleSize || 0} recent reviews · analysed by Bonza`}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ASPECTS.map(([key, label]) => (
              <AspectBar key={key} label={label} score={shownAspects[key]} />
            ))}
          </div>
          {shownAspects.summary && (
            <p className="text-[12px] text-ink-600 leading-snug mt-3 pt-3 border-t border-ink-900/[0.06]">
              {shownAspects.summary}
            </p>
          )}
        </div>
      )}

      {/* Bonza verified guests */}
      <Section title="Bonza verified guests" count={bonza.length}>
        {canReview && <WriteReview placeId={placeId} propertyName={result?.name} onDone={load} />}
        {bonza.length ? (
          bonza.map((rv, i) => <ReviewCard key={i} rv={rv} verified />)
        ) : (
          <p className="text-[12px] text-ink-300 mb-3">
            No Bonza guest reviews yet — guests who book this stay through Bonza can review it here.
          </p>
        )}
      </Section>

      {/* Other reviews (Google) */}
      <Section title="Other Reviews" count={google.matched ? google.total : undefined}>
        {webReviews.length ? (
          <>
            {webReviews.map((rv, i) => (
              <ReviewCard key={i} rv={rv} />
            ))}
            <p className="text-[10px] text-ink-300 mt-1">
              {isMock ? "Sample reviews — connect Google Places for genuine reviews." : "Reviews from Google"}
              {google.mapsUri && !isMock && (
                <>
                  {" · "}
                  <a href={google.mapsUri} target="_blank" rel="noopener noreferrer" className="text-bonza font-semibold hover:underline">
                    View on Google Maps
                  </a>
                </>
              )}
            </p>
          </>
        ) : (
          <p className="text-[12px] text-ink-300">No verified web reviews found for this property yet.</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="text-[14px] font-display font-semibold text-ink-900">{title}</h3>
        {count != null && <span className="text-[11px] text-ink-300 tabular-nums">{Number(count).toLocaleString()}</span>}
      </div>
      {children}
    </div>
  );
}

function AspectBar({ label, score }) {
  const pct = Math.max(0, Math.min(100, (Number(score) || 0) * 10));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[12px] font-semibold text-ink-900">{label}</span>
        <span className="text-[12px] font-semibold text-ink-900 tabular-nums">{(Number(score) || 0).toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-ink-900/[0.08] rounded-full overflow-hidden">
        <div className="h-1.5 bg-bonza rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ReviewCard({ rv, verified }) {
  return (
    <div className="bg-cream rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[12px] font-semibold text-ink-900 truncate">
            {rv.authorUri ? (
              <a href={rv.authorUri} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {rv.author}
              </a>
            ) : (
              rv.author
            )}
          </p>
          {verified && (
            <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-[#EAF6EE] text-[#1E7E40] text-[9px] font-bold px-1.5 py-0.5">
              VERIFIED STAY
            </span>
          )}
          {rv.relativeTime && rv.relativeTime !== "sample" && (
            <span className="text-[10px] text-ink-300 shrink-0">· {rv.relativeTime}</span>
          )}
        </div>
        {rv.rating != null && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#1E7E40] tabular-nums shrink-0">
            <StarIcon width="11" height="11" /> {Number(rv.rating).toFixed(1)}
          </span>
        )}
      </div>
      <p className="text-[12px] text-ink-600 leading-relaxed">{rv.text}</p>
    </div>
  );
}

function WriteReview({ placeId, propertyName, onDone }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rating: 5, location: 5, comfort: 5, facilities: 5, text: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.text.trim()) return setError("Please add a short comment.");
    setSaving(true);
    setError("");
    try {
      await submitBonzaReview({ placeId, propertyName, ...form });
      setOpen(false);
      onDone?.();
    } catch (e) {
      setError(e?.response?.data?.error?.message || "Couldn't submit your review.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-3 rounded-full bg-bonza text-white text-[12px] font-semibold px-4 py-2 hover:bg-bonza-dark"
      >
        Write a review
      </button>
    );
  }

  return (
    <div className="bg-white border border-ink-900/[0.1] rounded-xl p-4 mb-3">
      <StarPicker label="Overall" value={form.rating} onChange={set("rating")} />
      {ASPECTS.map(([key, label]) => (
        <StarPicker key={key} label={label} value={form[key]} onChange={set(key)} />
      ))}
      <textarea
        value={form.text}
        onChange={(e) => set("text")(e.target.value)}
        placeholder="Tell other travellers about your stay…"
        rows={3}
        className="w-full mt-2 text-[12px] rounded-lg border border-ink-900/[0.12] p-2.5 focus:outline-none focus:border-bonza"
      />
      {error && <p className="text-[11px] text-[#c0603c] mt-1">{error}</p>}
      <div className="flex gap-2 mt-2">
        <button onClick={submit} disabled={saving} className="rounded-full bg-bonza text-white text-[12px] font-semibold px-4 py-2 disabled:opacity-50">
          {saving ? "Posting…" : "Post review"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-full bg-cream text-ink-600 text-[12px] font-semibold px-4 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

function StarPicker({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12px] text-ink-600">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(n)} aria-label={`${label} ${n}`} className={n <= value ? "text-bonza" : "text-ink-900/[0.18]"}>
            <StarIcon width="16" height="16" />
          </button>
        ))}
      </div>
    </div>
  );
}
