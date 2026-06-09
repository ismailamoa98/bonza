// utils/affiliateLinkGenerator.js — Per-booking-type affiliate link generation.
// Builds flight / hotel / car affiliate link objects (one per booking type) for
// the vendor the user actually selected, each with its own tracking id and
// commission rate. Falls back to the scenario's default vendor (or United /
// Marriott / Hertz) when no explicit selection is provided.
const { COMMISSION_RATES } = require("../config/constants");

// Known vendor -> booking host. Unknown vendors fall back to a slugified domain.
const VENDOR_HOSTS = {
  United: "united.com",
  "Qatar Airways": "qatarairways.com",
  Etihad: "etihad.com",
  Marriott: "marriott.com",
  Hyatt: "hyatt.com",
  IHG: "ihg.com",
  Hertz: "hertz.com",
  Enterprise: "enterprise.com",
  Alamo: "alamo.com",
  Avis: "avis.com",
  "Pay Cash": "kayak.com",
};

function hostFor(vendor) {
  if (VENDOR_HOSTS[vendor]) return VENDOR_HOSTS[vendor];
  const slug = String(vendor || "vendor")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return `${slug || "vendor"}.com`;
}

function isoDate(value) {
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch (_err) {
    return "";
  }
}

// `selectedVendors` (optional): { flight: {vendor}, hotel: {vendor}, car: {vendor} }
// reflecting the user's current picks. When absent, the scenario's top-level
// vendor fields are used.
exports.generateAffiliateLinks = (trip, scenario, trackingId, selectedVendors = {}) => {
  const flightDetails = scenario.flightDetails || {};
  const hotelDetails = scenario.hotelDetails || {};
  const carDetails = scenario.carDetails || {};

  const flightVendor = selectedVendors.flight?.vendor || flightDetails.airline || "United";
  const hotelVendor =
    selectedVendors.hotel?.vendor || hotelDetails.program || hotelDetails.vendor || "Marriott";
  const carVendor = selectedVendors.car?.vendor || carDetails.vendor || "Hertz";

  const checkIn = isoDate(trip.checkIn);
  const checkOut = isoDate(trip.checkOut);

  const flight = {
    vendor: flightVendor,
    type: "flight",
    affiliateUrl:
      `https://${hostFor(flightVendor)}?aff_id=XYZ&cabin=J` +
      `&from=${encodeURIComponent(trip.origin)}` +
      `&to=${encodeURIComponent(trip.destination)}` +
      `&passengers=${trip.numberOfTravelers || 1}`,
    trackingId: `${trackingId}-flight`,
    commissionRate: COMMISSION_RATES.flight,
  };

  const hotel = {
    vendor: hotelVendor,
    type: "hotel",
    affiliateUrl:
      `https://${hostFor(hotelVendor)}?aff_id=ABC` +
      `&hotel_name=${encodeURIComponent(selectedVendors.hotel?.label || hotelDetails.name || "")}` +
      `&checkin=${checkIn}&checkout=${checkOut}`,
    trackingId: `${trackingId}-hotel`,
    commissionRate: COMMISSION_RATES.hotel,
  };

  const car = {
    vendor: carVendor,
    type: "car",
    affiliateUrl:
      `https://${hostFor(carVendor)}?aff_id=DEF` +
      `&location=${encodeURIComponent(trip.destination)}` +
      `&dates=${checkIn}_${checkOut}`,
    trackingId: `${trackingId}-car`,
    commissionRate: COMMISSION_RATES.car,
  };

  return { flight, hotel, car };
};
