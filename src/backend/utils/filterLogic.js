// utils/filterLogic.js — Pure filtering + sorting for the hotel/flight grids.
// The routes parse query params into a typed `filters` object and hand it here.
// Each filter is skipped when its value is null/empty, so partial filters work.

// --- Hotels -----------------------------------------------------------------
exports.filterHotels = (hotels, filters = {}) => {
  let result = [...hotels];

  if (filters.minPrice != null) {
    result = result.filter((h) => h.pricePerNight >= filters.minPrice);
  }
  if (filters.maxPrice != null) {
    result = result.filter((h) => h.pricePerNight <= filters.maxPrice);
  }
  if (filters.stars && filters.stars.length) {
    result = result.filter((h) => filters.stars.includes(h.stars));
  }
  if (filters.amenities && filters.amenities.length) {
    result = result.filter((h) => filters.amenities.some((a) => h.benefits.includes(a)));
  }
  if (filters.loyalty && filters.loyalty.length) {
    result = result.filter((h) =>
      filters.loyalty.some((l) => h.loyaltyPrograms[String(l).toLowerCase()])
    );
  }
  if (filters.minRating != null) {
    result = result.filter((h) => h.rating >= filters.minRating);
  }
  if (filters.propertyType && filters.propertyType.length) {
    result = result.filter((h) => filters.propertyType.includes(h.propertyType));
  }
  if (filters.freeCancellation) {
    result = result.filter((h) => h.freeCancellation);
  }
  if (filters.breakfast) {
    result = result.filter((h) => h.breakfastIncluded);
  }

  if (filters.sort === "price") {
    result.sort((a, b) => a.pricePerNight - b.pricePerNight);
  } else if (filters.sort === "rating") {
    result.sort((a, b) => b.rating - a.rating);
  } else if (filters.sort === "value") {
    const cheapestPoints = (h) =>
      Math.min(...Object.values(h.loyaltyPrograms).map((p) => p.pointsPerNight), Infinity);
    result.sort((a, b) => cheapestPoints(a) - cheapestPoints(b));
  }

  return result;
};

// --- Flights ----------------------------------------------------------------
const durationHours = (f) =>
  (new Date(f.arrivalTime) - new Date(f.departureTime)) / 3600000;

// True if a UTC hour falls in any of the requested time-of-day buckets.
const inTimeBuckets = (hour, buckets) =>
  buckets.some((t) => {
    if (t === "early") return hour >= 5 && hour < 9;
    if (t === "morning") return hour >= 9 && hour < 12;
    if (t === "afternoon") return hour >= 12 && hour < 17;
    if (t === "evening") return hour >= 17;
    return false;
  });

exports.filterFlights = (flights, filters = {}) => {
  let result = [...flights];

  if (filters.minPrice != null) {
    result = result.filter((f) => f.basePrice >= filters.minPrice);
  }
  if (filters.maxPrice != null) {
    result = result.filter((f) => f.basePrice <= filters.maxPrice);
  }
  if (filters.airlines && filters.airlines.length) {
    result = result.filter((f) => filters.airlines.includes(f.airline));
  }
  if (filters.cabin) {
    result = result.filter((f) => f.cabin === filters.cabin);
  }
  if (filters.departureTime && filters.departureTime.length) {
    result = result.filter((f) =>
      inTimeBuckets(new Date(f.departureTime).getUTCHours(), filters.departureTime)
    );
  }
  if (filters.arrivalTime && filters.arrivalTime.length) {
    result = result.filter((f) =>
      inTimeBuckets(new Date(f.arrivalTime).getUTCHours(), filters.arrivalTime)
    );
  }
  if (filters.maxStops != null) {
    result = result.filter((f) => f.stops <= filters.maxStops);
  }
  if (filters.refundable) {
    result = result.filter((f) => f.refundable);
  }
  if (filters.baggage) {
    result = result.filter((f) => f.baggageIncluded);
  }
  if (filters.minDuration != null) {
    result = result.filter((f) => durationHours(f) >= filters.minDuration);
  }
  if (filters.maxDuration != null) {
    result = result.filter((f) => durationHours(f) <= filters.maxDuration);
  }

  if (filters.sort === "price") {
    result.sort((a, b) => a.basePrice - b.basePrice);
  } else if (filters.sort === "duration") {
    result.sort((a, b) => durationHours(a) - durationHours(b));
  } else if (filters.sort === "airline") {
    result.sort((a, b) => a.airline.localeCompare(b.airline));
  }

  return result;
};

// --- Cars -------------------------------------------------------------------
exports.filterCars = (cars, filters = {}) => {
  let result = [...cars];

  if (filters.minPrice != null) {
    result = result.filter((c) => c.pricePerDay >= filters.minPrice);
  }
  if (filters.maxPrice != null) {
    result = result.filter((c) => c.pricePerDay <= filters.maxPrice);
  }
  if (filters.carClass && filters.carClass.length) {
    result = result.filter((c) => filters.carClass.includes(c.carClass));
  }
  if (filters.vendors && filters.vendors.length) {
    result = result.filter((c) => filters.vendors.includes(c.vendor));
  }

  if (filters.sort === "price") {
    result.sort((a, b) => a.pricePerDay - b.pricePerDay);
  } else if (filters.sort === "vendor") {
    result.sort((a, b) => a.vendor.localeCompare(b.vendor));
  }

  return result;
};
