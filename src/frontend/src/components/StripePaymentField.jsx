// components/StripePaymentField.jsx — Stripe Elements card field (mock fallback without publishable key).
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
export const HAS_STRIPE_KEY = typeof KEY === "string" && KEY.startsWith("pk_");
const stripePromise = HAS_STRIPE_KEY ? loadStripe(KEY) : null;

const APPEARANCE = {
  theme: "flat",
  variables: {
    colorPrimary: "#da7756",
    colorText: "#2a2420",
    colorTextPlaceholder: "#9a9088",
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    borderRadius: "8px",
    spacingUnit: "3px",
  },
};

export function BookingElements({ clientSecret, children }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: APPEARANCE }}>
      {children}
    </Elements>
  );
}

export { PaymentElement, useStripe, useElements };
