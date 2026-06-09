// hooks/useOptimization.js — Step 2 orchestration (browse & optimize).
// sendMessage() posts a chat turn to Bonza; createLink() generates the booking +
// affiliate links from the flight + hotel the user clicked in the grids.
import { useState } from "react";
import { sendChatMessage, createBookingLink, apiErrorMessage } from "../utils/api";
import { useAppStore } from "../store/appStore";

// Loyalty program id -> affiliate vendor name (matches VENDOR_HOSTS on the API).
const HOTEL_VENDOR = { marriott: "Marriott", ihg: "IHG", hilton: "Hilton" };

// Build the { flight, hotel, car } vendor objects the booking endpoint expects.
function selectionVendors(flight, hotel, car) {
  const vendors = {};
  if (flight) vendors.flight = { vendor: flight.airline, label: flight.cabin };
  if (hotel) {
    const programKey = Object.keys(hotel.loyaltyPrograms || {})[0];
    vendors.hotel = { vendor: HOTEL_VENDOR[programKey] || "Marriott", label: hotel.name };
  }
  if (car) vendors.car = { vendor: car.vendor, label: car.carClass };
  return vendors;
}

export function useOptimization() {
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const tripId = useAppStore((s) => s.tripId);
  const selectedFlight = useAppStore((s) => s.selectedFlight);
  const selectedHotel = useAppStore((s) => s.selectedHotel);
  const selectedCar = useAppStore((s) => s.selectedCar);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const setBooking = useAppStore((s) => s.setBooking);

  // Send a user message and append Bonza's reply.
  const sendMessage = async (message) => {
    setSending(true);
    setError(null);
    addChatMessage({ role: "user", content: message });
    try {
      const reply = await sendChatMessage(tripId, null, message);
      addChatMessage({ role: "bonza", content: reply.response });
      return true;
    } catch (err) {
      const msg = apiErrorMessage(err);
      setError(msg);
      addChatMessage({ role: "bonza", content: `Sorry — ${msg}` });
      return false;
    } finally {
      setSending(false);
    }
  };

  // Create the booking link for the clicked flight + hotel.
  const createLink = async () => {
    setCreating(true);
    setError(null);
    try {
      const vendors = selectionVendors(selectedFlight, selectedHotel, selectedCar);
      const data = await createBookingLink(tripId, null, vendors);
      setBooking(data);
      return true;
    } catch (err) {
      setError(apiErrorMessage(err));
      return false;
    } finally {
      setCreating(false);
    }
  };

  return { sendMessage, createLink, sending, creating, error };
}
