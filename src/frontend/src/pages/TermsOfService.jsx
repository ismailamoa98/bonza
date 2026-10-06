// pages/TermsOfService.jsx — public terms of service (draft template; see LegalPage banner).
import LegalPage from "../components/LegalPage";

const SECTIONS = [
  {
    heading: "Acceptance of these terms",
    body: "By using Bonza you agree to these Terms of Service. If you do not agree, please do not use the service. If you use Bonza on behalf of an organisation, you confirm you have authority to accept these terms for it.",
  },
  {
    heading: "What Bonza is",
    body: [
      "Bonza is an optimisation and booking-facilitation service. We help you compare and book travel using the best mix of cash and loyalty points, and we explain the trade-offs.",
      "The travel provider — the airline, hotel or car-hire company — is the party that actually supplies and is responsible for your trip, under its own terms. Bonza is not the travel provider and is not a party to that contract.",
    ],
  },
  {
    heading: "Your account",
    body: "You are responsible for keeping your account details accurate and your login secure. Accounts are managed through our authentication provider (Clerk). You must be old enough to enter into a binding contract in your country.",
  },
  {
    heading: "Points, awards and estimates",
    body: "Points valuations, award availability and “best value” rankings are estimates to help you decide — they are not guarantees. We never guarantee award seats, upgrades or a specific redemption, and availability can change at any time. Your use of loyalty points is also governed by your loyalty programme’s own terms.",
  },
  {
    heading: "Bookings and payments",
    body: "Where you book cash travel, payments are processed by Stripe and the travel provider’s terms (including fares, baggage, changes and cancellations) apply. For points bookings we may hand you off to the relevant programme or partner site to complete the redemption. Review the provider’s terms before you book.",
  },
  {
    heading: "Bonza Pro",
    body: "Bonza Pro is a paid subscription that unlocks additional features. Fees, billing frequency and what’s included are shown at the point of purchase. You can cancel at any time; cancellation takes effect at the end of the current billing period and access continues until then, unless stated otherwise.",
  },
  {
    heading: "Affiliate relationships",
    body: "Bonza may earn a commission when you book through some partner links. This never changes the price you pay and does not determine how we rank options — we rank by value to you.",
  },
  {
    heading: "Acceptable use",
    body: "Don’t misuse the service: no scraping, reverse engineering, interfering with its operation, or using it unlawfully or to infringe others’ rights.",
  },
  {
    heading: "Disclaimers",
    body: "The service is provided “as is”. Prices, availability and points figures are indicative and sourced from third parties; we don’t warrant they are complete, accurate or available at booking time.",
  },
  {
    heading: "Limitation of liability",
    body: "To the extent permitted by law, Bonza is not liable for the acts or omissions of travel providers, or for indirect or consequential loss. Nothing in these terms limits liability that cannot be limited by law.",
  },
  {
    heading: "Governing law",
    body: "These terms are governed by the laws of England & Wales, and the courts of England & Wales have exclusive jurisdiction, unless mandatory local law provides otherwise.",
  },
  {
    heading: "Changes and contact",
    body: "We may update these terms; the current version always lives here. Questions? Email legal@bonza.travel.",
  },
];

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="2 October 2026"
      intro="These terms govern your use of Bonza’s website and services."
      sections={SECTIONS}
    />
  );
}
