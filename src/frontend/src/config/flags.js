// config/flags.js — Phase 25 §25i. Frontend mirror of the backend feature flags. The bundled flight+hotel
// single-total CASH checkout is gated here as well as server-side (env.bundledCheckoutEnabled). It defaults ON
// for the build and must be set to "false" at go-live until the ATOL question (§25h) is answered. Flight-only
// and hotel-only cash flows (and all points flows) are never gated.
export const bundledCheckoutEnabled =
  String(import.meta.env?.VITE_BUNDLED_CHECKOUT_ENABLED ?? "true").toLowerCase() !== "false";
