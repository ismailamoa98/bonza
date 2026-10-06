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

// Unified Phase 12 search — one call returns cash hotels (+points), cash flights (+award) and context.
export const searchTrip = (body) =>
  client.post("/search", body).then((r) => r.data);

// Resolve one hotel by its search id (duffelHotelId) — used by the booking page to restore the exact
// chosen property on a hard refresh / cold deep link when the store is empty.
export const getSearchHotel = (id, params) =>
  client.get(`/search/hotel/${id}`, { params }).then((r) => r.data.hotel);

// Genuine property core (Google Places): rating, review count, editorial summary, address, map coords.
export const getHotelDetails = (params) =>
  client.get("/hotels/details", { params }).then((r) => r.data);

// Genuine property reviews (Google Places) + aspect scores + Bonza verified reviews for the open hotel.
export const getReviews = (params) =>
  client.get("/reviews", { params }).then((r) => r.data);

// Submit a Bonza verified review (backend enforces a confirmed booking for the property).
export const submitBonzaReview = (body) =>
  client.post("/reviews/bonza", body).then((r) => r.data);

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

// Cross-leg trip optimiser — { legs:[{type,label,cashGbp}], overrides? } → recommended split + scenarios.
export const optimizeTripSelection = (payload) =>
  client.post("/optimize/trip", payload).then((r) => r.data);

export const recordAffiliateClick = (payload) =>
  client.post("/affiliate/click", payload).then((r) => r.data);

export const confirmJourneyBooking = (journeyId, leg) =>
  client.post("/journeys/confirm-booking", { journeyId, leg }).then((r) => r.data);

// Compare redemption options for one hotel stay (cash · points · cash+points), cheapest recommended.
export const getHotelRedemptionOptions = (payload) =>
  client.post("/optimize/hotel-options", payload).then((r) => r.data);

// Points redemption handoff — creates a journey, records the click, returns the award-site deep link
// (+ a buy-points step for a buy blend, + any transfer the user needs first). Nothing is booked until the
// user self-reports.
export const pointsHandoff = (payload) =>
  client.post("/bookings/points-handoff", payload).then((r) => r.data);

export const confirmTransfer = (journeyId, { fromProgramme, toProgramme, amount } = {}) =>
  client.post("/journeys/confirm-transfer", { journeyId, fromProgramme, toProgramme, amount }).then((r) => r.data);

export const getRecommendations = () =>
  client.get("/recommendations").then((r) => r.data);

// Phase 14 — Points Portfolio. Portfolio = accounts grouped by category + header metrics; programme detail
// = held value, best transfer, and the full transfer-partner table for one account.
export const getPointsPortfolio = () =>
  client.get("/points/portfolio").then((r) => r.data);

export const getProgrammeDetail = (accountId) =>
  client.get(`/points/programme/${accountId}`).then((r) => r.data);

// Phase 17 — hero destination award board (public; adds affordability when signed in).
export const getHeroDestinations = () =>
  client.get("/destinations/hero").then((r) => r.data);

// Phase 18 — homepage discovery rails (public; origin-aware, session-aware). ?origin= overrides the city.
export const getDiscover = (origin) =>
  client.get("/destinations/discover", { params: origin ? { origin } : {} }).then((r) => r.data);

// Phase 18 — country landing page (public): the country + its bookable cities.
export const getCountry = (code) =>
  client.get(`/destinations/country/${code}`).then((r) => r.data);

// Phase 18 — Explore Everywhere (public): every priced country for an origin (map + list + grid data).
export const getExplore = (origin) =>
  client.get("/explore", { params: origin ? { origin } : {} }).then((r) => r.data);

// Phase 18 §18i — city drawer: gallery, trip total, hotels on points, six-month availability.
export const getExploreCity = (cityId, origin) =>
  client.get(`/explore/city/${cityId}`, { params: origin ? { origin } : {} }).then((r) => r.data);

// Phase 20 — per-day cash fares + award flags for the date picker (public; empty days when From/To not both set).
export const getPriceCalendar = (from, to, month, nights) =>
  client.get("/price-calendar", { params: { from, to, month, ...(nights ? { nights } : {}) } }).then((r) => r.data);

// Phase 19 — country page: hero + stats + cities priced against origin/month/nights/party (prices recompute).
export const getExploreCountry = (code, { origin, month, nights, adults } = {}) => {
  const params = {};
  if (origin) params.origin = origin;
  if (month) params.month = month;
  if (nights != null) params.nights = nights;
  if (adults != null) params.adults = adults;
  return client.get(`/explore/${code}`, { params }).then((r) => r.data);
};

export const getPointsActivity = (params = {}) =>
  client.get("/points/activity", { params }).then((r) => r.data);

export const getPointsReview = () =>
  client.get("/points/review").then((r) => r.data);

export const acknowledgeReview = () =>
  client.post("/points/review/acknowledge").then((r) => r.data);

export const setManualBalance = (accountId, balance) =>
  client.patch(`/points/balance/${accountId}`, { balance }).then((r) => r.data);

export const deleteDuplicate = (accountId) =>
  client.delete(`/points/duplicate/${accountId}`).then((r) => r.data);

export const removeAccount = (accountId) =>
  client.delete(`/points/account/${accountId}`).then((r) => r.data);

// Deep sync ("Gathering your points") — client-driven stepping for live progress.
export const deepSyncStart = (provider) =>
  client.post("/loyalty/deep-sync/start", { provider }).then((r) => r.data);
export const deepSyncStep = (runId, programme) =>
  client.post("/loyalty/deep-sync/step", { runId, programme }).then((r) => r.data);
export const deepSyncFinish = (runId) =>
  client.post("/loyalty/deep-sync/finish", { runId }).then((r) => r.data);

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

// Phase 22 — Support. Help centre (public), tickets, assistant, programme contacts, status, admin.
export const getHelpTopics = () => client.get("/help/topics").then((r) => r.data.topics || []);
export const getHelpTopPicks = () => client.get("/help/top-picks").then((r) => r.data.picks || []);
export const getOpenTickets = () => client.get("/support/tickets/open").then((r) => r.data.tickets || []);
export const getHelpCategories = () => client.get("/help/categories").then((r) => r.data);
export const searchHelp = (q) => client.get("/help/search", { params: { q } }).then((r) => r.data.results || []);
export const getPopularHelp = () => client.get("/help/popular").then((r) => r.data.articles || []);
export const getHelpCategory = (slug) => client.get(`/help/category/${slug}`).then((r) => r.data);
export const getHelpArticle = (slug) => client.get(`/help/articles/${slug}`).then((r) => r.data);
export const voteHelpful = (slug, helpful) => client.post(`/help/articles/${slug}/helpful`, { helpful }).then((r) => r.data);

export const createTicket = (payload) => client.post("/support/tickets", payload).then((r) => r.data);
export const getTickets = () => client.get("/support/tickets").then((r) => r.data.tickets || []);
export const getTicket = (ref, email) => client.get(`/support/tickets/${ref}`, { params: email ? { email } : {} }).then((r) => r.data.ticket);
export const postTicketMessage = (id, body) => client.post(`/support/tickets/${id}/messages`, { body }).then((r) => r.data);
export const askAssistant = (message, history) => client.post("/support/assistant", { message, history }).then((r) => r.data);
export const getProgrammeContact = (prog) => client.get(`/support/programme-contact/${prog}`).then((r) => r.data.contact);
export const getStatus = () => client.get("/status").then((r) => r.data);
export const getAdminUser = (userId) => client.get(`/admin/user/${userId}`).then((r) => r.data);

export const apiErrorMessage = (err) =>
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  "Something went wrong. Please try again.";

export default client;
