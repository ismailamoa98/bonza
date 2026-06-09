// pages/Step2_Optimization.jsx — Step 2: browse & optimize.
// Top: a trip search bar (edit in place). Left: tabbed hotel/flight grids with a
// filter sidebar. Right: the optimizer panel for the running flight + hotel
// combination. Picking cards recomputes the panel live; Bonza narrates changes.
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import StepIndicator from "./StepIndicator";
import SearchBar from "../components/SearchBar";
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

  return (
    <div className="mx-auto max-w-6xl px-4">
      <StepIndicator currentStep={2} />

      <div className="mb-4">
        <SearchBar />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_360px]">
        <FilterSidebar />

        <div>
          <div className="mb-3 flex items-center justify-between">
            <TabSwitcher />
            <SortMenu />
          </div>
          {activeTab === "hotels" && <HotelGrid />}
          {activeTab === "flights" && <FlightGrid />}
          {activeTab === "cars" && <CarGrid />}
        </div>

        <div className="space-y-4">
          <OptimizationPanel onRatioCommit={onRatioCommit} />
          <ChatAdvisor messages={chatMessages} onSend={sendMessage} sending={sending} />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={onCreateLink}
        disabled={creating || !canBook}
        className="mt-6 w-full rounded-lg bg-bonza px-4 py-3 font-semibold text-white hover:bg-bonza-dark disabled:opacity-50"
      >
        {creating ? "Creating link…" : "Create Booking Link"}
      </button>
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
      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-600 focus:border-bonza focus:outline-none"
    >
      {SORT_OPTIONS[activeTab].map(([value, label]) => (
        <option key={value} value={value}>
          Sort: {label}
        </option>
      ))}
    </select>
  );
}
