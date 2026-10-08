// pages/CookiePolicy.jsx — public cookie policy (draft template; see LegalPage banner).
import LegalPage from "../components/LegalPage";

const SECTIONS = [
  {
    heading: "What cookies are",
    body: "Cookies are small files stored on your device when you visit a website. Similar technologies (such as local storage) work the same way. They help a site function, remember your preferences, and understand how it’s used.",
  },
  {
    heading: "Cookies we use",
    body: "Bonza uses a small number of cookies and similar technologies, grouped by purpose:",
    list: [
      "Strictly necessary — sign-in and session security (via our authentication provider, Clerk). The site can’t work without these.",
      "Functional — remembering preferences such as your chosen origin, recent searches and UI choices.",
      "Analytics — understanding usage so we can improve the service (aggregated, not used to identify you).",
      "Third-party — set by embedded providers when their features load, for example Stripe (payments) and map tiles.",
    ],
  },
  {
    heading: "Third-party cookies",
    body: "Some cookies are set by the providers above when their components are used on our pages. Their use of data is governed by their own policies.",
  },
  {
    heading: "Managing cookies",
    body: "You can control or delete cookies through your browser settings, and block non-essential cookies there. A dedicated Privacy-settings manager for granular, per-category consent is coming to Bonza; until then, blocking strictly-necessary cookies may stop parts of the site working.",
  },
  {
    heading: "Changes and contact",
    body: "We may update this policy as our use of cookies changes; the current version always lives here. Questions? Email privacy@bonza.travel.",
  },
];

export default function CookiePolicy() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated="2 October 2026"
      path="/cookies"
      description="How Bonza uses cookies and similar technologies — strictly necessary, functional, analytics and third-party — and how to manage them."
      intro="This Cookie Policy explains how Bonza uses cookies and similar technologies on our website."
      sections={SECTIONS}
    />
  );
}
