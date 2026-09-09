// components/search/DetailPanel.jsx — large right-side overlay that takes over the screen when a result
// is selected (Skyscanner pattern): dimmed scrim over the results, wide sliding panel, tabbed content,
// sticky dual CTAs. Bonza's loyalty layer sits on top of a familiar detail view.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PROGRAMME_LABELS } from "./programmes";
import { hotelPhotos } from "./photo";
import PhotoGallery from "./PhotoGallery";
import AirlineLogo from "./AirlineLogo";
import FlightItinerary from "./FlightItinerary";
import TripToggle from "./TripToggle";
import { fmtDate } from "./flightFormat";
import { pointsFor } from "./points";
import { pointsForFullStay } from "./redemptionMath";
import CompareDeals from "./CompareDeals";
import ReviewsTab from "./ReviewsTab";
import PointsRedeemModal from "./PointsRedeemModal";
import PostClickPrompt from "../PostClickPrompt";
import { getHotelDetails } from "../../utils/api";
import {
  XIcon,
  ShareIcon,
  CardIcon,
  CheckIcon,
  LockIcon,
  ShieldIcon,
  SparklesIcon,
  HeadsetIcon,
  StarIcon,
  MapPinIcon,
  WifiIcon,
  PoolIcon,
  CoffeeIcon,
  ParkingIcon,
  GlassIcon,
  SpaIcon,
  DumbbellIcon,
} from "./icons";

const TABS = ["Compare deals", "Reviews", "Hotel details", "Location"];

export default function DetailPanel({ result, meta, loyaltyAccounts = [], onClose }) {
  const [tab, setTab] = useState("Compare deals");
  const [shown, setShown] = useState(false);
  const navigate = useNavigate();

  // Slide-in on mount, scroll-lock the page behind, close on Escape.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!result) return null;
  const isFlight = !result.cashOption;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isFlight ? "Flight details" : "Hotel details"}
        className={`w-full bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ${
          isFlight ? "max-w-[600px]" : "max-w-[920px]"
        } ${shown ? "translate-x-0" : "translate-x-full"}`}
      >
        {isFlight ? (
          <FlightBody result={result} meta={meta} navigate={navigate} onClose={onClose} />
        ) : (
          <HotelBody
            result={result}
            meta={meta}
            loyaltyAccounts={loyaltyAccounts}
            tab={tab}
            setTab={setTab}
            navigate={navigate}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function CloseButton({ onClose }) {
  return (
    <button
      onClick={onClose}
      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 shadow flex items-center justify-center text-ink-600 hover:text-ink-900 z-10"
      aria-label="Close"
    >
      <XIcon width="16" height="16" />
    </button>
  );
}

// Copies the current deep-link URL (incl. ?hotel= / ?flight=) so the recipient opens straight to this
// panel; shows a confirmation tick for 2s.
function ShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked (insecure context / denied) — leave state unchanged */
    }
  };
  return (
    <button
      onClick={share}
      className="absolute top-3 right-14 w-9 h-9 rounded-full bg-white/95 shadow flex items-center justify-center text-ink-600 hover:text-ink-900 z-10"
      aria-label={copied ? "Link copied" : "Share this deal"}
      title={copied ? "Link copied" : "Copy link to share"}
    >
      {copied ? <CheckIcon width="16" height="16" className="text-[#1E7E40]" /> : <ShareIcon width="15" height="15" />}
    </button>
  );
}

function HotelBody({ result, meta, loyaltyAccounts, tab, setTab, navigate, onClose }) {
  const cash = result.cashOption;
  const pts = pointsFor(result);
  const travelers = meta?.travelers || 1;
  const nights = hotelNights(meta);
  const totalCash = (cash?.priceGbp || 0) * nights;
  const creditsIfCash = parseFloat((totalCash * 0.03).toFixed(2));
  const city = result.location?.city || result.location || meta?.destination;

  // Genuine place core from Google Places (rating, review count, editorial summary, address, coords).
  // Offline / no match → falls back to the plumbed per-property inventory fields below.
  const coords = result.location?.geographic_coordinates;
  const [details, setDetails] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getHotelDetails({ name: result.name, city, lat: coords?.latitude, lng: coords?.longitude })
      .then((d) => !cancelled && d.matched && setDetails(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [result.name, city, coords?.latitude, coords?.longitude]);

  // Header score: Google 0–5 (with review count) when matched, else the property's own 0–10 rating.
  const scoreOutOf10 = details?.rating != null ? details.rating * 2 : result.rating ?? null;
  const scoreDisplay = details?.rating != null ? details.rating.toFixed(1) : result.rating != null ? result.rating.toFixed(1) : null;
  const reviewCount = details?.total || 0;

  const amenities = Array.isArray(result.amenities) ? result.amenities.filter(Boolean) : [];
  const description = details?.summary || buildDescription(result, city, amenities);
  const address = details?.address || city;
  const mapLat = details?.latitude ?? coords?.latitude ?? null;
  const mapLng = details?.longitude ?? coords?.longitude ?? null;

  const userAccount = loyaltyAccounts.find((a) => a.programme === pts?.programme);
  // Points to cover the whole stay (from cash + ¢/pt) — used to label the CTA with the amount + programme.
  const fullStayPoints = pts ? pointsForFullStay(totalCash, pts.centsPerPoint) : 0;
  const ptsProgrammeLabel = PROGRAMME_LABELS[pts?.programme] || pts?.programme || "points";

  const [pointsModal, setPointsModal] = useState(false);
  const [handoffJourney, setHandoffJourney] = useState(null);

  function bookCash() {
    const qs = new URLSearchParams({
      hotel: result.duffelHotelId,
      type: "cash",
      origin: meta?.origin || "",
      destination: meta?.destination || "",
      checkIn: meta?.departureDate || "",
      checkOut: meta?.returnDate || "",
      adults: String(travelers),
    });
    navigate(`/booking?${qs.toString()}`);
  }
  function bookPoints() {
    setPointsModal(true);
  }

  return (
    <>
      {/* Photo header — genuine Duffel photos as a slideshow; gradient shows through when none */}
      <div className="relative flex-shrink-0 h-[280px] bg-gradient-to-br from-[#6FB7D4] to-[#3D7EA6]">
        <PhotoGallery photos={hotelPhotos(result)} alt={result.name} />
        <CloseButton onClose={onClose} />
        <ShareButton />
      </div>

      {/* Title + tabs */}
      <div className="px-6 pt-4 flex-shrink-0">
        <h2 className="text-[22px] font-display font-semibold text-ink-900 leading-tight">{result.name}</h2>
        <div className="flex items-center gap-2 text-[12px] text-ink-300 mt-1 mb-3">
          <span className="text-bonza">{"★".repeat(result.starRating || 4)}</span>
          <span>·</span>
          <span>{city}</span>
          {scoreDisplay && (
            <span className="ml-1 bg-[#EAF6EE] text-[#1E7E40] font-semibold px-2 py-0.5 rounded-md text-[11px] tabular-nums">
              {scoreDisplay} {ratingLabel(scoreOutOf10)}
              {reviewCount > 0 && (
                <span className="font-normal text-[#1E7E40]/70"> · {reviewCount.toLocaleString()} reviews</span>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-1 border-b border-ink-900/[0.06] overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[13px] font-semibold py-2.5 px-4 border-b-2 whitespace-nowrap transition-all ${
                tab === t ? "text-bonza border-bonza" : "text-ink-300 border-transparent hover:text-ink-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="px-6 py-5 flex-1 overflow-y-auto">
        {tab === "Compare deals" && (
          <div className="space-y-6">
            {/* Interactive points<->cash tool. `availablePoints` is injected here (a single account balance
                today); later a trip-aware, transfer-partner-conflict-aware allocator can pass the
                *remaining* budget for this programme — no change needed to CompareDeals / redemptionMath. */}
            <CompareDeals
              key={result.duffelHotelId || result.name}
              totalCash={totalCash}
              centsPerPoint={pts?.centsPerPoint || 0}
              aboveBenchmark={!!pts?.aboveBenchmark}
              programme={pts?.programme}
              availablePoints={userAccount?.balance || 0}
              balanceKnown={!!userAccount}
              accounts={loyaltyAccounts}
            />

            {/* Loyalty earnings + trust */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <SectionLabel>LOYALTY EARNINGS ON THIS STAY</SectionLabel>
                <div>
                  {(loyaltyAccounts.length ? loyaltyAccounts.slice(0, 3) : [null]).map((account, i, arr) => (
                    <div
                      key={account?.programme || i}
                      className={`flex items-center gap-3 py-2.5 ${i < arr.length - 1 ? "border-b border-ink-900/[0.04]" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#FBE8E0] flex items-center justify-center flex-shrink-0 text-bonza">
                        <CardIcon />
                      </div>
                      <div className="flex-1">
                        <p className="text-[12px] font-semibold text-ink-900">
                          {account ? PROGRAMME_LABELS[account.programme] || account.programme : "Bonza Credits"}
                        </p>
                        <p className="text-[10px] text-ink-300">{account ? "1–3% on card spend" : "3% cashback on cash bookings"}</p>
                      </div>
                      <p className="text-[12px] font-semibold text-ink-900 tabular-nums">
                        £{(totalCash * 0.02).toFixed(0)}–{(totalCash * 0.03).toFixed(0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>WHY BOOK WITH BONZA</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    [<LockIcon key="l" />, "Books direct", "Earn all status perks with the hotel"],
                    [<ShieldIcon key="s" />, "ATOL protected", "Your money is safe if we fail"],
                    [<SparklesIcon key="p" />, "Best points value", "We find your top cash + points mix"],
                    [<HeadsetIcon key="h" />, "24/7 support", "Bonza team on call"],
                  ].map(([icon, title, desc]) => (
                    <div key={title} className="bg-cream rounded-xl p-3 flex gap-2">
                      <span className="text-bonza flex-shrink-0 mt-px">{icon}</span>
                      <div>
                        <p className="text-[11px] font-semibold text-ink-900 mb-0.5">{title}</p>
                        <p className="text-[10px] text-ink-300 leading-tight">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "Reviews" && <ReviewsTab result={result} meta={meta} />}

        {tab === "Hotel details" && (
          <div>
            {/* Highlights band — the key facts, made obvious. Each tile only renders with real data. */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {scoreDisplay && (
                <HighlightTile value={scoreDisplay} label={ratingLabel(scoreOutOf10) || "Guest score"} />
              )}
              {result.starRating && (
                <HighlightTile value={<span className="text-bonza">{"★".repeat(result.starRating)}</span>} label="Star rating" />
              )}
              {result.propertyType && <HighlightTile value={result.propertyType} label="Property type" />}
            </div>

            <SectionLabel>ABOUT THIS STAY</SectionLabel>
            <p className="text-[13px] text-ink-600 leading-relaxed mb-6 mt-1">{description}</p>

            <SectionLabel>AMENITIES</SectionLabel>
            {amenities.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                {amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2.5 bg-cream rounded-xl px-3 py-2.5">
                    <span className="text-bonza flex-shrink-0">{amenityIcon(a)}</span>
                    <span className="text-[12px] font-semibold text-ink-900">{a}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-ink-300 mt-1">Amenities not listed for this property.</p>
            )}
          </div>
        )}

        {tab === "Location" && (
          <div>
            <SectionLabel>LOCATION</SectionLabel>
            <div className="flex items-start gap-2 mb-3">
              <span className="text-bonza flex-shrink-0 mt-0.5">
                <MapPinIcon width="16" height="16" />
              </span>
              <p className="text-[13px] text-ink-600">{address}</p>
            </div>
            {mapLat != null && mapLng != null ? (
              <div className="rounded-xl overflow-hidden border border-ink-900/[0.08]">
                <iframe
                  title={`Map of ${result.name}`}
                  className="w-full h-72 block"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={osmEmbedUrl(mapLat, mapLng)}
                />
              </div>
            ) : (
              <div className="relative h-72 rounded-xl overflow-hidden bg-gradient-to-br from-[#dbe7ec] to-[#c3d6de] flex items-center justify-center">
                <div className="text-bonza flex flex-col items-center">
                  <MapPinIcon width="28" height="28" />
                  <span className="text-[11px] font-semibold text-ink-600 mt-1">{city}</span>
                </div>
                <span className="absolute bottom-2 right-2 text-[9px] text-ink-300">Map unavailable</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-ink-300">{mapLat != null ? "Map data © OpenStreetMap contributors" : ""}</p>
              {details?.mapsUri && (
                <a
                  href={details.mapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-bonza font-semibold hover:underline"
                >
                  View on Google Maps
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTAs */}
      <div className="border-t border-ink-900/[0.06] px-6 py-4 flex flex-col sm:flex-row gap-3 bg-white flex-shrink-0">
        <TripToggle type="hotel" item={result} variant="cta" />
        <button
          onClick={bookCash}
          className={`flex-1 py-3 rounded-full text-[13px] font-semibold tabular-nums transition-all ${
            pts ? "bg-cream text-ink-700 border border-ink-900/[0.1] hover:border-ink-900/[0.2]" : "bg-bonza text-white"
          }`}
        >
          Book with cash — £{totalCash.toFixed(0)} · earn £{creditsIfCash} credits
        </button>
        {pts && (
          <button
            onClick={bookPoints}
            className="flex-1 py-3 bg-bonza text-white rounded-full text-[13px] font-semibold flex items-center justify-center gap-2 tabular-nums text-center"
          >
            <StarIcon width="15" height="15" className="flex-shrink-0" /> Book with {fullStayPoints.toLocaleString()} {ptsProgrammeLabel} pts
          </button>
        )}
      </div>

      <PointsRedeemModal
        open={pointsModal}
        onClose={() => setPointsModal(false)}
        result={result}
        meta={meta}
        programme={pts?.programme}
        centsPerPoint={pts?.centsPerPoint || 0}
        totalCash={totalCash}
        onHandoff={(journeyId) => setHandoffJourney(journeyId)}
      />
      {handoffJourney && (
        <PostClickPrompt
          journeyId={handoffJourney}
          programme={pts?.programme}
          leg="hotel"
          onClose={() => setHandoffJourney(null)}
        />
      )}
    </>
  );
}

function FlightBody({ result, meta, navigate, onClose }) {
  const out = result.slices?.[0];
  const ret = result.slices?.[1];
  const travelers = meta?.travelers || 1;

  function bookFlight() {
    const qs = new URLSearchParams({
      flight: result.id || result.duffelOfferId,
      type: "cash",
      origin: meta?.origin || "",
      destination: meta?.destination || "",
      checkIn: meta?.departureDate || "",
      checkOut: meta?.returnDate || "",
      adults: String(travelers),
    });
    navigate(`/booking?${qs.toString()}`);
  }

  const slices = [out, ret].filter(Boolean);
  const airlineName = result.airline || slices[0]?.segments?.[0]?.carrier || "Flight";
  const airlineCode = result.airlineCode || slices[0]?.segments?.[0]?.carrierCode;
  const routeFrom = slices[0]?.origin?.code || meta?.origin;
  const routeTo = slices[0]?.destination?.code || meta?.destination;

  return (
    <>
      <div className="relative flex-shrink-0 px-6 pt-5 pb-4 border-b border-ink-900/[0.06]">
        <CloseButton onClose={onClose} />
        <ShareButton />
        <div className="flex items-center gap-3">
          <AirlineLogo code={airlineCode} name={airlineName} size={40} />
          <div className="min-w-0">
            <h2 className="text-[20px] font-display font-semibold text-ink-900 leading-tight">{airlineName}</h2>
            <p className="text-[12px] text-ink-300 mt-0.5 tabular-nums">
              {routeFrom} → {routeTo}
              {result.cabin ? ` · ${result.cabin}` : ""} · {travelers} {travelers === 1 ? "adult" : "adults"}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 flex-1 overflow-y-auto">
        {slices.map((slice, i) => (
          <div key={i} className="mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <SectionLabel>{i === 0 ? "OUTBOUND" : "RETURN"}</SectionLabel>
              <span className="text-[11px] text-ink-300">{fmtDate(slice.segments?.[0]?.departure)}</span>
            </div>
            <div className="bg-cream rounded-2xl p-4">
              <FlightItinerary slice={slice} cabin={result.cabin} />
            </div>
          </div>
        ))}

        <SectionLabel>FARE</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {result.cabin && <FareChip>{result.cabin}</FareChip>}
          <FareChip>{result.refundable ? "Refundable" : "Non-refundable"}</FareChip>
          <FareChip>{result.baggageIncluded ? "Checked bag included" : "Checked bag extra"}</FareChip>
        </div>
      </div>

      <div className="border-t border-ink-900/[0.06] px-6 py-4 bg-white flex-shrink-0 flex gap-3">
        <TripToggle type="flight" item={result} variant="cta" />
        <button onClick={bookFlight} className="flex-1 py-3 bg-bonza text-white rounded-full text-[13px] font-semibold tabular-nums">
          Book for £{(result.totalAmount || 0).toFixed(0)}
          {result.creditsIfCash > 0 ? ` — earn £${result.creditsIfCash} credits` : ""}
        </button>
      </div>
    </>
  );
}

function FareChip({ children }) {
  return (
    <span className="inline-flex items-center bg-cream text-ink-600 text-[11px] font-semibold px-2.5 py-1 rounded-full">
      {children}
    </span>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[11px] font-bold text-ink-300 tracking-wider mb-2">{children}</p>;
}

function HighlightTile({ value, label }) {
  return (
    <div className="bg-cream rounded-xl px-3 py-3 text-center">
      <p className="text-[18px] font-display font-semibold text-ink-900 leading-tight tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold text-ink-300 tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

// Map an amenity label to a matching icon (lowercase-substring match); falls back to a checkmark.
const AMENITY_ICONS = [
  ["wifi", WifiIcon],
  ["internet", WifiIcon],
  ["pool", PoolIcon],
  ["swim", PoolIcon],
  ["breakfast", CoffeeIcon],
  ["coffee", CoffeeIcon],
  ["parking", ParkingIcon],
  ["bar", GlassIcon],
  ["lounge", GlassIcon],
  ["restaurant", GlassIcon],
  ["spa", SpaIcon],
  ["wellness", SpaIcon],
  ["gym", DumbbellIcon],
  ["fitness", DumbbellIcon],
];
function amenityIcon(name) {
  const key = String(name || "").toLowerCase();
  const hit = AMENITY_ICONS.find(([token]) => key.includes(token));
  const IconCmp = hit ? hit[1] : CheckIcon;
  return <IconCmp width="16" height="16" />;
}

// Word for a 0–10 guest score (Google 0–5 is doubled before this is called).
function ratingLabel(score10) {
  if (score10 == null) return "";
  if (score10 >= 9) return "Excellent";
  if (score10 >= 8) return "Very good";
  if (score10 >= 7) return "Good";
  return "";
}

// Per-property description from real attributes — used when Google has no editorial summary. Honest and
// varied per hotel (no invented uniform copy): star rating, property type, city, and a couple of amenities.
function buildDescription(result, city, amenities) {
  const type = (result.propertyType || "hotel").toLowerCase();
  const stars = result.starRating ? `${result.starRating}-star ` : "";
  let s = `${result.name} is a ${stars}${type} in ${city}.`;
  const highlights = (amenities || []).slice(0, 3);
  if (highlights.length) s += ` Highlights include ${highlights.join(", ").toLowerCase()}.`;
  if (result.breakfastIncluded) s += " Breakfast is included.";
  return s;
}

// A keyless OpenStreetMap embed centred on the property with a marker (no API key required).
function osmEmbedUrl(lat, lng) {
  const d = 0.01; // ~1km bounding box
  const bbox = [lng - d, lat - d, lng + d, lat + d].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

// Nights between the searched check-in/out (min 1) — hotel rates are per night, so totals scale by this.
function hotelNights(meta) {
  if (!meta?.departureDate || !meta?.returnDate) return 1;
  const n = Math.round((new Date(meta.returnDate) - new Date(meta.departureDate)) / 86400000);
  return n > 0 ? n : 1;
}
