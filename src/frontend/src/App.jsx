// App.jsx — routes + Clerk RequireAuth + OnboardingGate.
import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import {
  ClerkProvider,
  useAuth,
  useUser,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
} from "@clerk/clerk-react";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";
import IncidentBanner from "./components/IncidentBanner";
import HomePage from "./pages/HomePage"; // eager — the landing/LCP route

// Route-level code-splitting: secondary/heavy pages load on demand, so maplibre-gl (/explore),
// react-markdown (/help), react-day-picker and Stripe JS stay out of the initial bundle.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Destinations = lazy(() => import("./pages/Destinations"));
const CountryPage = lazy(() => import("./pages/CountryPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const PointsPage = lazy(() => import("./pages/PointsPage"));
const PointsReviewPage = lazy(() => import("./pages/PointsReviewPage"));
const PointsConnectingPage = lazy(() => import("./pages/PointsConnectingPage"));
const SignInPage = lazy(() => import("./pages/SignInPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const FlexibleDates = lazy(() => import("./pages/FlexibleDates"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const UpgradePage = lazy(() => import("./pages/UpgradePage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Settings = lazy(() => import("./pages/Settings"));
const BookingsHistory = lazy(() => import("./pages/BookingsHistory"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const HelpHome = lazy(() => import("./pages/HelpHome"));
const HelpCategory = lazy(() => import("./pages/HelpCategory"));
const HelpArticlePage = lazy(() => import("./pages/HelpArticlePage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const Complaints = lazy(() => import("./pages/Complaints"));
const TicketView = lazy(() => import("./pages/TicketView"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const AdminUserPage = lazy(() => import("./pages/AdminUserPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { useAppStore } from "./store/appStore";
import {
  setAuthTokenGetter,
  getSubscriptionStatus,
  getCredits,
  getLoyaltyAccounts,
  getProfile,
} from "./utils/api";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const HAS_CLERK_KEY =
  typeof PUBLISHABLE_KEY === "string" &&
  PUBLISHABLE_KEY.startsWith("pk_") &&
  !PUBLISHABLE_KEY.endsWith("...");

function ClerkSetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 font-jakarta text-ink">
      <div className="w-full max-w-lg rounded-2xl border border-[#e3ded6] bg-white p-7 shadow-[0_24px_60px_rgba(40,30,20,0.12)]">
        <h1 className="font-display text-[22px] font-semibold tracking-[-0.01em]">
          Clerk key required
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Bonza now uses Clerk for authentication, which has no offline fallback. The app can&apos;t
          start until a real publishable key is set.
        </p>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[13px] text-ink-soft">
          <li>
            Get your keys at <span className="font-semibold">clerk.com → API Keys</span>.
          </li>
          <li>
            In <code className="rounded bg-cream px-1 py-0.5 text-[12px]">.env</code> set{" "}
            <code className="rounded bg-cream px-1 py-0.5 text-[12px]">VITE_CLERK_PUBLISHABLE_KEY</code>,{" "}
            <code className="rounded bg-cream px-1 py-0.5 text-[12px]">CLERK_PUBLISHABLE_KEY</code> (same
            value) and <code className="rounded bg-cream px-1 py-0.5 text-[12px]">CLERK_SECRET_KEY</code>.
          </li>
          <li>Restart the dev server (Vite only reads .env at startup).</li>
        </ol>
        <p className="mt-4 text-[12px] text-ink-muted">
          Test keys (<code className="text-[11px]">pk_test_…</code> / <code className="text-[11px]">sk_test_…</code>)
          work fully in local dev.
        </p>
      </div>
    </div>
  );
}

function AuthSync() {
  const { getToken, isLoaded } = useAuth();
  const { user, isSignedIn } = useUser();
  const setUser = useAppStore((s) => s.setUser);
  const logout = useAppStore((s) => s.logout);
  const setProStatus = useAppStore((s) => s.setProStatus);
  const setCreditBalance = useAppStore((s) => s.setCreditBalance);
  const setLoyaltyAccounts = useAppStore((s) => s.setLoyaltyAccounts);
  const setProfile = useAppStore((s) => s.setProfile);

  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user) {
      setUser({
        id: user.id,
        name: user.fullName,
        email: user.primaryEmailAddress?.emailAddress || null,
      });
      getSubscriptionStatus().then((s) => setProStatus(s.isPro)).catch(() => {});
      getCredits().then((c) => setCreditBalance(c.totalCreditsGbp)).catch(() => {});
      getLoyaltyAccounts().then(setLoyaltyAccounts).catch(() => {});
      getProfile().then(setProfile).catch(() => {});
    } else {
      logout(); // clears user + isPro/creditBalance/loyaltyAccounts/profile
    }
  }, [isLoaded, isSignedIn, user, setUser, logout, setProStatus, setCreditBalance, setLoyaltyAccounts, setProfile]);

  return null;
}

function OnboardingGate() {
  const { isSignedIn } = useUser();
  const profile = useAppStore((s) => s.profile);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isSignedIn || !profile) return;
    if (profile.onboardingComplete) return;
    // Allow the auth pages and the loyalty "Gathering your points" page mid-onboarding.
    if (
      pathname === "/onboarding" ||
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up") ||
      pathname === "/points/connecting"
    )
      return;
    navigate("/onboarding", { replace: true });
  }, [isSignedIn, profile, pathname, navigate]);

  return null;
}

function RequireAuth({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default function App() {
  if (!HAS_CLERK_KEY) return <ClerkSetupNotice />;

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <BrowserRouter>
        <AuthSync />
        <OnboardingGate />
        <div className="flex min-h-screen flex-col bg-cream text-ink">
          <IncidentBanner />
          <Navigation />
          <main className="flex-1">
            {/* Each page owns its own vertical rhythm. */}
            <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center" aria-busy="true"><div className="h-8 w-8 animate-spin rounded-full border-2 border-bonza border-t-transparent" /></div>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/sign-in/*" element={<SignInPage />} />
              <Route path="/sign-up/*" element={<SignUpPage />} />
              <Route path="/login" element={<Navigate to="/sign-in" replace />} />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/destinations"
                element={
                  <RequireAuth>
                    <Destinations />
                  </RequireAuth>
                }
              />
              <Route
                path="/points"
                element={
                  <RequireAuth>
                    <PointsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/points/review"
                element={
                  <RequireAuth>
                    <PointsReviewPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/points/connecting"
                element={
                  <RequireAuth>
                    <PointsConnectingPage />
                  </RequireAuth>
                }
              />
              {/* Phase 18 — Explore Everywhere map + country landing pages (public) */}
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/explore/:code" element={<CountryPage />} />
              <Route path="/flexible" element={<FlexibleDates />} />
              {/* Old optimize route now folds into the search results page. */}
              <Route path="/optimize" element={<Navigate to="/search" replace />} />
              <Route
                path="/search"
                element={
                  <RequireAuth>
                    <SearchPage />
                  </RequireAuth>
                }
              />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/upgrade" element={<UpgradePage />} />
              {/* Public legal pages (footer). */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              {/* Phase 22 — Support (public). Specific /help/* routes before /help/:category so they don't shadow. */}
              <Route path="/help" element={<HelpHome />} />
              <Route path="/help/contact" element={<ContactPage />} />
              <Route path="/help/complaints" element={<Complaints />} />
              <Route path="/help/ticket/:ref" element={<TicketView />} />
              <Route path="/help/:category" element={<HelpCategory />} />
              <Route path="/help/:category/:slug" element={<HelpArticlePage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route
                path="/admin/user/:userId"
                element={
                  <RequireAuth>
                    <AdminUserPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <RequireAuth>
                    <Onboarding />
                  </RequireAuth>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireAuth>
                    <Settings />
                  </RequireAuth>
                }
              />
              <Route
                path="/bookings"
                element={
                  <RequireAuth>
                    <BookingsHistory />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </main>
          <Footer />
          <CookieConsent />
        </div>
      </BrowserRouter>
    </ClerkProvider>
  );
}
