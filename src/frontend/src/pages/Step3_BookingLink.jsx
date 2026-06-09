// pages/Step3_BookingLink.jsx — Step 3: shareable booking link + Book Now cards.
// Reflects the flight + hotel the user optimized on Step 2. Each "Book Now" opens
// its affiliate URL in a new tab and fires conversion tracking.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StepIndicator from "./StepIndicator";
import BookingCard from "../components/BookingCard";
import {
  useAppStore,
  computeCombination,
  tripNights,
} from "../store/appStore";
import { trackConversion } from "../utils/api";
import { shortDate, formatMoney, formatPoints, percent } from "../utils/format";

export default function Step3_BookingLink() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const trip = useAppStore((s) => s.trip);
  const bookingLink = useAppStore((s) => s.bookingLink);
  const affiliateLinks = useAppStore((s) => s.affiliateLinks);
  const selectedFlight = useAppStore((s) => s.selectedFlight);
  const selectedHotel = useAppStore((s) => s.selectedHotel);
  const selectedCar = useAppStore((s) => s.selectedCar);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const ratio = useAppStore((s) => s.ratio);

  // No booking link (e.g. refresh) -> restart the flow.
  useEffect(() => {
    if (!bookingLink) navigate("/", { replace: true });
  }, [bookingLink, navigate]);

  if (!bookingLink || !affiliateLinks) return null;

  const nights = tripNights(trip);
  const totals = computeCombination(selectedFlight, selectedHotel, selectedCar, loyaltyPoints, nights, ratio);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  };

  // Open the affiliate URL and record the conversion (fire-and-forget).
  const book = (link) => {
    window.open(link.affiliateUrl, "_blank", "noopener");
    trackConversion(bookingLink.token, link.type, {
      vendor: link.vendor,
      commissionRate: link.commissionRate,
    }).catch(() => {});
  };

  const dates = `${shortDate(trip?.checkIn)} – ${shortDate(trip?.checkOut)}`;

  return (
    <div className="mx-auto max-w-3xl px-4">
      <StepIndicator currentStep={3} />

      {/* Section A: the booking link */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-800">Your booking link</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {bookingLink.url}
          </code>
          <button
            type="button"
            onClick={copy}
            className="rounded-lg border border-bonza px-4 py-2 text-sm font-medium text-bonza hover:bg-bonza-50"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Valid for 7 days · Track all bookings from this link · Share with travel companions
        </p>
      </section>

      {/* You selected — the chosen flight + hotel */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-700">You selected:</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {selectedFlight && (
            <li>
              ✓ Flight: <b>{selectedFlight.airline}</b> ({selectedFlight.cabin})
            </li>
          )}
          {selectedHotel && (
            <li>
              ✓ Hotel: <b>{selectedHotel.name}</b> ({selectedHotel.stars}-star)
            </li>
          )}
          {selectedCar && (
            <li>
              ✓ Car: <b>{selectedCar.vendor}</b> ({selectedCar.carClass})
            </li>
          )}
        </ul>
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-700">
          You'll pay <b>{formatMoney(totals.totalCash)}</b>
          {totals.pointsUsed > 0 && (
            <>
              {" "}
              + <b>{formatPoints(totals.pointsUsed)} pts</b> ({percent(ratio)} on points)
            </>
          )}
          {totals.savingsAmount > 0 && (
            <span className="text-green-600"> · saving {formatMoney(totals.savingsAmount)}</span>
          )}
        </p>
      </section>

      {/* Section B: what the booking page will show */}
      <h3 className="mt-6 text-sm font-semibold text-slate-700">
        What your booking page will show
      </h3>
      <div className="mt-3 space-y-3">
        {selectedFlight && (
          <BookingCard
            title="Flight"
            left={`${trip?.origin} → ${trip?.destination} · ${shortDate(trip?.checkIn)}`}
            right={`${affiliateLinks.flight.vendor} · ${selectedFlight.cabin}`}
            buttonLabel="Book Flight"
            onBook={() => book(affiliateLinks.flight)}
          />
        )}
        {selectedHotel && (
          <BookingCard
            title="Hotel"
            left={`${selectedHotel.name} · ${dates}`}
            right={`${affiliateLinks.hotel.vendor} · ${selectedHotel.stars}-star`}
            buttonLabel="Book Hotel"
            onBook={() => book(affiliateLinks.hotel)}
          />
        )}
        {selectedCar && (
          <BookingCard
            title="Car Rental"
            left={`${dates} · ${trip?.destination}`}
            right={`${affiliateLinks.car.vendor} · ${selectedCar.carClass}`}
            buttonLabel="Book Car"
            onBook={() => book(affiliateLinks.car)}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate("/")}
        className="mt-6 text-sm font-medium text-bonza hover:underline"
      >
        ← Start a new trip
      </button>
    </div>
  );
}
