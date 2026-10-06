// pages/PrivacyPolicy.jsx — public privacy policy (draft template; see LegalPage banner). Describes how Bonza
// handles personal data, including the read-only loyalty-email parsing that powers points optimisation.
import LegalPage from "../components/LegalPage";

const SECTIONS = [
  {
    heading: "Who we are",
    body: "Bonza is an AI travel optimiser that helps you book flights, hotels and cars for the best combination of cash and loyalty points. This policy explains what personal data we collect, why, and the choices you have. For any privacy question or to exercise your rights, contact us at privacy@bonza.travel.",
  },
  {
    heading: "Data we collect",
    body: "We collect only what we need to find and book your best-value trips:",
    list: [
      "Account details — your name and email, managed through our authentication provider (Clerk), plus your home airport and travel preferences.",
      "Loyalty data — your loyalty-programme balances and status. You can enter these manually, or connect Gmail/Outlook so we can read statement emails to keep balances up to date (see “Connecting your loyalty email” below).",
      "Trip activity — the searches you run, trips you save, and bookings you make.",
      "Payment data — processed by our payment provider (Stripe). We do not store full card numbers.",
      "Usage and device data — basic analytics and device information to operate and improve the service.",
    ],
  },
  {
    heading: "How we use your data",
    body: "We use your data to:",
    list: [
      "Build and rank your best-value trip options across cash and points.",
      "Show the value of your loyalty points and status, and surface award availability where we can.",
      "Create booking links and process bookings with travel providers.",
      "Personalise recommendations and send you service and (where you opt in) marketing notifications.",
      "Secure the service, prevent fraud, and meet our legal obligations.",
    ],
  },
  {
    heading: "Legal bases (UK GDPR)",
    body: "We rely on: your consent (e.g. connecting a loyalty email account, marketing emails); performance of a contract (operating your account and bookings); and our legitimate interests (improving the service, security and fraud prevention). You can withdraw consent at any time.",
  },
  {
    heading: "Connecting your loyalty email",
    body: [
      "If you connect Gmail or Outlook, access is read-only and used solely to parse loyalty-programme balances and status from statement emails.",
      "We do not store the contents of your emails, send email on your behalf, or read anything unrelated to loyalty programmes. You can disconnect at any time in Settings, which revokes our access.",
    ],
  },
  {
    heading: "Who we share data with",
    body: "We share data only with the providers needed to run the service, under appropriate agreements:",
    list: [
      "Travel partners — airlines, hotels, car-hire companies and aggregators (including Duffel) to search and book.",
      "Payments — Stripe.",
      "Authentication — Clerk.",
      "AI processing — Anthropic (Claude) to generate optimisation explanations.",
      "Financial/loyalty connectivity — Plaid and email providers where you connect them.",
      "Email delivery — Resend. Affiliate networks where a booking is completed via a partner link.",
    ],
  },
  {
    heading: "Data retention",
    body: "We keep personal data only as long as needed to provide the service and meet legal and accounting obligations, after which it is deleted or anonymised.",
  },
  {
    heading: "Your rights",
    body: "Subject to UK GDPR, you can request access to your data, correction, deletion, a portable copy, restriction, or object to processing, and withdraw consent. To exercise any right, email privacy@bonza.travel. You also have the right to complain to the Information Commissioner’s Office (ICO).",
  },
  {
    heading: "International transfers",
    body: "Some providers process data outside the UK/EEA. Where they do, we rely on appropriate safeguards such as the UK International Data Transfer Agreement or Standard Contractual Clauses.",
  },
  {
    heading: "Changes to this policy",
    body: "We may update this policy from time to time. We’ll post the new version here and update the “Last updated” date.",
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="2 October 2026"
      intro="This Privacy Policy explains how Bonza collects, uses and protects your personal data when you use our website and services."
      sections={SECTIONS}
    />
  );
}
