// utils/api.js — axios client (relative /api/v1) + Clerk bearer interceptor + endpoint helpers.
import axios from "axios";

const client = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

let authTokenGetter = null;
export function setAuthTokenGetter(getter) {
  authTokenGetter = getter;
}

client.interceptors.request.use(async (config) => {
  try {
    const token = await authTokenGetter?.();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* not signed in / token unavailable — backend dev fallback handles it */
  }
  return config;
});

export const getTrips = () => client.get("/trips").then((r) => r.data.trips || []);

export const getAirports = (q) =>
  client.get("/airports", { params: { q } }).then((r) => r.data.airports || []);

export const getLoyaltyPoints = () =>
  client.get("/user/loyalty-points").then((r) => r.data);

export const createTrip = (tripData) =>
  client.post("/trips", tripData).then((r) => r.data);

export const optimizeTrip = (tripId) =>
  client.post("/optimize", { tripId }).then((r) => r.data);

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

export const sendChatMessage = (tripId, selectedScenarioId, message) =>
  client.post("/chat", { tripId, selectedScenarioId, message }).then((r) => r.data);

export const createBookingLink = (tripId, selectedScenarioId, selectedVendors) =>
  client
    .post("/create-booking-link", { tripId, selectedScenarioId, selectedVendors })
    .then((r) => r.data);

export const trackConversion = (bookingToken, type, data = {}) =>
  client.post("/conversion", { bookingToken, type, ...data }).then((r) => r.data);

export const createBookingPaymentIntent = (amountGbp, tripId) =>
  client.post("/bookings/payment-intent", { amountGbp, tripId }).then((r) => r.data);

export const confirmCashBooking = (payload) =>
  client.post("/bookings/confirm-cash", payload).then((r) => r.data);

export const getSubscriptionStatus = () =>
  client.get("/subscriptions/status").then((r) => r.data);

export const startProCheckout = () =>
  client.post("/subscriptions/create").then((r) => r.data);

export const cancelSubscription = () =>
  client.post("/subscriptions/cancel").then((r) => r.data);

export const getCredits = () => client.get("/credits").then((r) => r.data);

export const getLoyaltyAccounts = () =>
  client.get("/loyalty/accounts").then((r) => r.data.accounts || []);

export const syncLoyalty = (provider = "gmail") =>
  client.post("/loyalty/sync-email", { provider }).then((r) => r.data);

export const getRedemptionOptions = (tripId) =>
  client.post("/optimize/redemption", { tripId }).then((r) => r.data);

export const recordAffiliateClick = (payload) =>
  client.post("/affiliate/click", payload).then((r) => r.data);

export const confirmJourneyBooking = (journeyId, leg) =>
  client.post("/journeys/confirm-booking", { journeyId, leg }).then((r) => r.data);

export const getRecommendations = () =>
  client.get("/recommendations").then((r) => r.data);

export const getNotifications = () =>
  client.get("/notifications").then((r) => r.data);

export const markAllNotificationsRead = () =>
  client.post("/notifications/read-all").then((r) => r.data);

export const dismissNotification = (id) =>
  client.post(`/notifications/${id}/dismiss`).then((r) => r.data);

export const getNotificationPreferences = () =>
  client.get("/notifications/preferences").then((r) => r.data.preferences || {});

export const updateNotificationPreferences = (prefs) =>
  client.put("/notifications/preferences", prefs).then((r) => r.data.preferences);

export const getProfile = () => client.get("/user/profile").then((r) => r.data.profile);

export const updateProfile = (patch) =>
  client.patch("/user/profile", patch).then((r) => r.data.profile);

export const getLoyaltyProviders = () =>
  client.get("/loyalty/providers").then((r) => r.data.providers || {});

export const startLoyaltyOAuth = (provider, from = "settings") =>
  client.get(`/loyalty/oauth/${provider}/start`, { params: { from } }).then((r) => r.data.url);

export const syncLoyaltyNow = (provider) =>
  client.post("/loyalty/sync-now", { provider }).then((r) => r.data);

export const disconnectLoyalty = (provider) =>
  client.post("/loyalty/disconnect", { provider }).then((r) => r.data);

export const addLoyaltyAccount = (payload) =>
  client.post("/loyalty/accounts", payload).then((r) => r.data);

export const removeLoyaltyAccount = (programme) =>
  client.delete(`/loyalty/accounts/${programme}`).then((r) => r.data);

export const getBookings = () =>
  client.get("/bookings").then((r) => r.data.bookings || []);

export const apiErrorMessage = (err) =>
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  "Something went wrong. Please try again.";

export default client;
