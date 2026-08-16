// hooks/useOpenPackage.js — open a marketing package into the search results page (Phase 12).
// Parses the package's dates + destination and routes to /search with the trip pre-filled. Shared by
// the public homepage and the logged-in dashboard so browse behaviour stays identical.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildSearchUrl } from "../utils/searchUrl";
import { apiErrorMessage } from "../utils/api";

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

export function useOpenPackage() {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(null);

  const openPackage = (pkg) => {
    if (opening) return;
    setOpening(true);
    setOpenError(null);
    try {
      const { checkIn, checkOut } = parsePackageDates(pkg.dates);
      navigate(
        buildSearchUrl({
          origin: pkg.origin || "LHR",
          destination: pkg.destination || pkg.city,
          departureDate: checkIn,
          returnDate: checkOut,
          travelers: 2,
          style: "points_max",
          packageId: pkg.duffelHotelId || pkg.destination || pkg.city,
        })
      );
    } catch (err) {
      setOpenError(apiErrorMessage(err));
    } finally {
      setOpening(false);
    }
  };

  return { openPackage, opening, openError };
}
