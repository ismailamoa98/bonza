// pages/Step2_Optimization.jsx — Step 2 (route /optimize): browse & optimize.
// Chat-forward results page. Left sticky sidebar: trip summary, loyalty balances,
// and filters. Main column (revealed section by section): chat with Bonza, the
// "Your optimal package" recommendation panel for the running flight + hotel + car
// combination, then the tabbed inventory grids. Picking cards recomputes the panel
// live; Bonza narrates changes; "Proceed to booking" builds the link → step 3.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import StepIndicator from "./StepIndicator";
import SearchBar from "../components/SearchBar";
import TripSummary from "../components/TripSummary";
import LoyaltyCard from "../components/LoyaltyCard";
import TabSwitcher from "../components/TabSwitcher";
import FilterSidebar from "../components/FilterSidebar";
import HotelGrid from "../components/HotelGrid";
import FlightGrid from "../components/FlightGrid";
import CarGrid from "../components/CarGrid";
import OptimizationPanel from "../components/OptimizationPanel";
import ChatAdvisor from "../components/ChatAdvisor";
import { useOptimization } from "../hooks/useOptimization";
import {
  useAppStore,
  computeCombination,
  tripNights,
} from "../store/appStore";
import { formatMoney, formatPoints, percent } from "../utils/format";

export default function Step2_Optimization() {
  const navigate = useNavigate();
  const { sendMessage, createLink, sending, creating, error } = useOptimization();

  const trip = useAppStore((s) => s.trip);
  const activeTab = useAppStore((s) => s.activeTab);
  const selectedFlight = useAppStore((s) => s.selectedFlight);
  const selectedHotel = useAppStore((s) => s.selectedHotel);
  const selectedCar = useAppStore((s) => s.selectedCar);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const ratio = useAppStore((s) => s.ratio);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);

  // Collapsing the chat frees the right rail and reflows the results grid to 3-up.
  const [chatOpen, setChatOpen] = useState(true);
  const gridColumns = chatOpen ? 2 : 3;

  // No trip in the store (e.g. a refresh) -> restart at Step 1.
  useEffect(() => {
    if (!trip) navigate("/", { replace: true });
  }, [trip, navigate]);

  // Narrate selection changes in the chat (instant, no network round-trip).
  const firstRun = useRef(true);
  const flightId = selectedFlight?.id;
  const hotelId = selectedHotel?.id;
  const carId = selectedCar?.id;
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!flightId && !hotelId && !carId) return;
    const nights = tripNights(trip);
    const { savingsAmount } = computeCombination(
      selectedFlight,
      selectedHotel,
      selectedCar,
      loyaltyPoints,
      nights,
      ratio
    );
    const parts = [];
    if (selectedFlight) parts.push(`${selectedFlight.airline} ${selectedFlight.cabin}`);
    if (selectedHotel) parts.push(selectedHotel.name);
    if (selectedCar) parts.push(`${selectedCar.vendor} ${selectedCar.carClass}`);
    addChatMessage({
      role: "bonza",
      content:
        `Got it — ${parts.join(" + ")}. ` +
        (savingsAmount > 0
          ? `Paying ${percent(ratio)} on points saves you ${formatMoney(savingsAmount)} vs. cash.`
          : `I'll value this against your points as you set the mix.`),
      meta: "Updated now",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightId, hotelId, carId]);

  const onRatioCommit = (r) => {
    const nights = tripNights(trip);
    const { savingsAmount } = computeCombination(
      selectedFlight,
      selectedHotel,
      selectedCar,
      loyaltyPoints,
      nights,
      r
    );
    addChatMessage({
      role: "bonza",
      content: `Now ${percent(r)} on points — saving ${formatMoney(savingsAmount)} vs. all cash.`,
      meta: "Updated now",
    });
  };

  const onCreateLink = async () => {
    const ok = await createLink();
    if (ok) navigate("/booking");
  };

  if (!trip) return null;

  const canBook = Boolean(selectedFlight || selectedHotel || selectedCar);

  // Live points the current combination would spend — drives the loyalty card's
  // "balance after this trip" projection.
  const livePointsUsed = computeCombination(
    selectedFlight,
    selectedHotel,
    selectedCar,
    loyaltyPoints,
    tripNights(trip),
    ratio
  ).pointsUsed;

  return (
    <div className="min-h-screen bg-cream font-jakarta text-ink">
      <div className="mx-auto max-w-[100rem] px-4 py-6 lg:px-8">
        <StepIndicator currentStep={2} />

        <div
          className={`mt-2 grid grid-cols-1 gap-6 ${
            chatOpen ? "lg:grid-cols-[300px_1fr_390px]" : "lg:grid-cols-[300px_1fr]"
          }`}
        >
          {/* Left rail (sticky): trip recap, loyalty balances, filters */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <TripSummary />
            <LoyaltyCard loyaltyPoints={loyaltyPoints} variant="full" pointsUsed={livePointsUsed} />
            <FilterSidebar />
          </aside>

          {/* Center: recommendation panel → inventory grids */}
          <div className="space-y-5">
            <OptimizationPanel
              onRatioCommit={onRatioCommit}
              onProceed={onCreateLink}
              proceeding={creating}
              canProceed={canBook}
            />
            {error && <p className="text-[13px] text-red-600">{error}</p>}

            <SearchBar />
            <div className="flex items-center justify-between">
              <TabSwitcher />
              <SortMenu />
            </div>
            <div key={activeTab} className="animate-fadein">
              {activeTab === "hotels" && <HotelGrid columns={gridColumns} />}
              {activeTab === "flights" && <FlightGrid columns={gridColumns} />}
              {activeTab === "cars" && <CarGrid columns={gridColumns} />}
            </div>
          </div>

          {/* Right rail (sticky): the advisor — replaces the reference's map.
              Drops in from above each time it's reopened. */}
          {chatOpen && (
            <aside className="origin-top animate-dropin motion-reduce:animate-none lg:sticky lg:top-6 lg:self-start">
              <ChatAdvisor
                messages={chatMessages}
                onSend={sendMessage}
                sending={sending}
                onClose={() => setChatOpen(false)}
              />
            </aside>
          )}
        </div>
      </div>

      {/* Floating reopen button when the chat is collapsed */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex animate-slideup items-center gap-2 rounded-full bg-bonza px-4 py-3 text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(120,80,50,0.3)] transition-colors hover:bg-bonza-dark motion-reduce:animate-none"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          Chat with Bonza
        </button>
      )}
    </div>
  );
}

// Sort dropdown — options depend on the active tab.
const SORT_OPTIONS = {
  hotels: [
    ["recommended", "Recommended"],
    ["price", "Price"],
    ["rating", "Rating"],
    ["value", "Best points value"],
  ],
  flights: [
    ["recommended", "Recommended"],
    ["price", "Price"],
    ["duration", "Duration"],
    ["airline", "Airline"],
  ],
  cars: [
    ["recommended", "Recommended"],
    ["price", "Price"],
    ["vendor", "Rental company"],
  ],
};

function SortMenu() {
  const activeTab = useAppStore((s) => s.activeTab);
  const sort = useAppStore((s) => s.filters[s.activeTab].sort);
  const setFilters = useAppStore((s) => s.setFilters);

  return (
    <select
      value={sort || "recommended"}
      onChange={(e) => setFilters({ sort: e.target.value })}
      className="rounded-lg border border-[#e0d9cf] bg-white px-2 py-1.5 text-[13px] text-ink-soft focus:border-bonza focus:outline-none"
    >
      {SORT_OPTIONS[activeTab].map(([value, label]) => (
        <option key={value} value={value}>
          Sort: {label}
        </option>
      ))}
    </select>
  );
}
