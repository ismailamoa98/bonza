// hooks/useOpenPackage.js — Open a marketing package straight into booking.
// Builds a trip from the package, auto-picks the first flight/hotel/car, creates
// a booking link, stores it all, and routes to /booking. Shared by the public
// homepage and the logged-in dashboard so the deep-link behaviour stays identical.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import {
  getFlights,
  getHotels,
  getCars,
  createTrip,
  createBookingLink,
  apiErrorMessage,
} from "../utils/api";

// Loyalty program id -> affiliate vendor name (mirrors useOptimization.js).
const HOTEL_VENDOR = { marriott: "Marriott", ihg: "IHG", hilton: "Hilton" };

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Parse a package's "Jun 23 - Jul 1" into ISO check-in/out, rolled to the next
// upcoming occurrence (so a past month jumps to next year).
function parsePackageDates(dates) {
  const [a, b] = String(dates || "").split(" - ");
  const parsePart = (s) => {
    const [mon, day] = s.trim().split(/\s+/);
    return { m: MONTHS[mon?.toLowerCase()?.slice(0, 3)] ?? 0, d: parseInt(day, 10) || 1 };
  };
  const now = new Date();
  const ci = parsePart(a);
  let year = now.getUTCFullYear();
  let checkIn = new Date(Date.UTC(year, ci.m, ci.d));
  if (checkIn < now) {
    year += 1;
    checkIn = new Date(Date.UTC(year, ci.m, ci.d));
  }
  const co = parsePart(b || a);
  const outYear = co.m < ci.m ? year + 1 : year;
  const checkOut = new Date(Date.UTC(outYear, co.m, co.d));
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}

// "£1,240" -> 1240
const parseBudget = (cash) => Number(String(cash || "").replace(/[^0-9]/g, "")) || 0;

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

export function useOpenPackage() {
  const navigate = useNavigate();
  const setTrip = useAppStore((s) => s.setTrip);
  const setTripId = useAppStore((s) => s.setTripId);
  const setCurrentPackage = useAppStore((s) => s.setCurrentPackage);
  const setSelections = useAppStore((s) => s.setSelections);
  const setBooking = useAppStore((s) => s.setBooking);

  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(null);

  const openPackage = async (pkg) => {
    if (opening) return;
    setOpening(true);
    setOpenError(null);
    try {
      const { checkIn, checkOut } = parsePackageDates(pkg.dates);
      const destLabel = pkg.city;
      const tripData = {
        origin: "LHR",
        originLabel: "LHR — London",
        destination: destLabel,
        destinationLabel: destLabel,
        checkIn,
        checkOut,
        budget: parseBudget(pkg.cash),
        numberOfTravelers: 2,
        flexibility: false,
        preferences: { style: "Points Max" },
      };
      const { id } = await createTrip(tripData);
      setTrip(tripData);
      setTripId(id);
      setCurrentPackage(pkg);

      const [flights, hotels, cars] = await Promise.all([
        getFlights({ from: "LHR", to: destLabel, checkIn }),
        getHotels({ destination: destLabel, checkIn }),
        getCars({ location: destLabel, checkIn }),
      ]);
      const flight = flights[0] || null;
      const hotel = hotels[0] || null;
      const car = cars[0] || null;
      setSelections({ flight, hotel, car });

      const vendors = selectionVendors(flight, hotel, car);
      const data = await createBookingLink(id, null, vendors);
      setBooking(data);
      navigate("/booking");
    } catch (err) {
      setOpenError(apiErrorMessage(err));
      setOpening(false);
    }
  };

  return { openPackage, opening, openError };
}
