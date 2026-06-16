// utils/api.js — API client for the Bonza backend.
// Axios instance pointed at the versioned API (Vite proxies /api -> :5000 in
// dev), plus one typed helper per endpoint used by the 3-step flow.
import axios from "axios";

const client = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// --- Step 1: Trip Details ---------------------------------------------------

// GET /airports?q= -> [{ code, name, city, country, countryCode }]
export const getAirports = (q) =>
  client.get("/airports", { params: { q } }).then((r) => r.data.airports || []);

// GET /user/loyalty-points -> { amex, chaseUr, unitedMiles, marriottPoints, other }
export const getLoyaltyPoints = () =>
  client.get("/user/loyalty-points").then((r) => r.data);

// POST /trips -> { id, status }
export const createTrip = (tripData) =>
  client.post("/trips", tripData).then((r) => r.data);

// POST /optimize -> { recommendedScenarioId, recommendedScenario, allScenarios, conversationalAnalysis }
export const optimizeTrip = (tripId) =>
  client.post("/optimize", { tripId }).then((r) => r.data);

// --- Step 2: Browse & Optimize ----------------------------------------------

// GET /hotels?destination=&maxPrice=&stars=&… -> [hotel, …]
export const getHotels = (filters = {}) => {
  const params = {};
  if (filters.destination) params.destination = filters.destination;
  if (filters.minPrice) params.minPrice = filters.minPrice;
  if (filters.maxPrice) params.maxPrice = filters.maxPrice;
  if (filters.checkIn) params.checkIn = filters.checkIn;
  if (filters.stars?.length) params.stars = filters.stars.join(",");
  if (filters.amenities?.length) params.amenities = filters.amenities.join(",");
  if (filters.loyalty?.length) params.loyalty = filters.loyalty.join(",");
  if (filters.minRating) params.minRating = filters.minRating;
  if (filters.propertyType?.length) params.propertyType = filters.propertyType.join(",");
  if (filters.freeCancellation) params.freeCancellation = "true";
  if (filters.breakfast) params.breakfast = "true";
  if (filters.sort) params.sort = filters.sort;
  return client.get("/hotels", { params }).then((r) => r.data.hotels || []);
};

// GET /flights?from=&to=&cabin=&airlines=&… -> [flight, …]
export const getFlights = (filters = {}) => {
  const params = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.checkIn) params.checkIn = filters.checkIn;
  if (filters.minPrice) params.minPrice = filters.minPrice;
  if (filters.maxPrice) params.maxPrice = filters.maxPrice;
  if (filters.airlines?.length) params.airlines = filters.airlines.join(",");
  if (filters.cabin) params.cabin = filters.cabin;
  if (filters.departureTime?.length) params.departureTime = filters.departureTime.join(",");
  if (filters.arrivalTime?.length) params.arrivalTime = filters.arrivalTime.join(",");
  if (filters.maxStops != null) params.maxStops = filters.maxStops;
  if (filters.refundable) params.refundable = "true";
  if (filters.baggage) params.baggage = "true";
  if (filters.minDuration) params.minDuration = filters.minDuration;
  if (filters.maxDuration) params.maxDuration = filters.maxDuration;
  if (filters.sort) params.sort = filters.sort;
  return client.get("/flights", { params }).then((r) => r.data.flights || []);
};

// GET /cars?location=&maxPrice=&carClass=&vendors=&sort= -> [car, …]
export const getCars = (filters = {}) => {
  const params = {};
  if (filters.location) params.location = filters.location;
  if (filters.checkIn) params.checkIn = filters.checkIn;
  if (filters.minPrice) params.minPrice = filters.minPrice;
  if (filters.maxPrice) params.maxPrice = filters.maxPrice;
  if (filters.carClass?.length) params.carClass = filters.carClass.join(",");
  if (filters.vendors?.length) params.vendors = filters.vendors.join(",");
  if (filters.sort) params.sort = filters.sort;
  return client.get("/cars", { params }).then((r) => r.data.cars || []);
};

// POST /chat -> { response, updatedSelectedScenarioId, shouldHighlightCard }
export const sendChatMessage = (tripId, selectedScenarioId, message) =>
  client.post("/chat", { tripId, selectedScenarioId, message }).then((r) => r.data);

// POST /create-booking-link -> { bookingLink, affiliateLinks }
// selectedVendors: { flight, hotel, car } vendor objects the user picked.
export const createBookingLink = (tripId, selectedScenarioId, selectedVendors) =>
  client
    .post("/create-booking-link", { tripId, selectedScenarioId, selectedVendors })
    .then((r) => r.data);

// --- Step 3: Booking Link ---------------------------------------------------

// POST /conversion -> { tracked, conversionId }
export const trackConversion = (bookingToken, type, data = {}) =>
  client.post("/conversion", { bookingToken, type, ...data }).then((r) => r.data);

// Surfaces a friendly message from an Axios error for UI display.
export const apiErrorMessage = (err) =>
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  "Something went wrong. Please try again.";

export default client;
