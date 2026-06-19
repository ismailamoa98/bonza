// App.jsx — Root component & router.
// Wrapped in Clerk's <ClerkProvider> (Clerk owns auth). <AuthSync> mirrors the
// Clerk session into the Zustand store (for UI display) and registers Clerk's
// getToken with the api client so requests carry a bearer token.
// Public marketing flow ("/" -> "/optimize" -> "/booking") stays open so the
// anonymous demo works (backed by the backend dev-user fallback); "/dashboard"
// is the private area and requires sign-in.
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  ClerkProvider,
  useAuth,
  useUser,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
} from "@clerk/clerk-react";
import Navigation from "./components/Navigation";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import FlexibleDates from "./pages/FlexibleDates";
import Step2_Optimization from "./pages/Step2_Optimization";
import BookingPage from "./pages/BookingPage";
import { useAppStore } from "./store/appStore";
import { setAuthTokenGetter } from "./utils/api";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Clerk owns auth and has no offline mock — a missing or placeholder publishable
// key makes <ClerkProvider> throw and the whole app render blank. Detect that and
// show actionable setup guidance instead of a silent white screen.
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

// Bridges Clerk -> the rest of the app: caches the user for display and feeds
// the api client a fresh session token on every request.
function AuthSync() {
  const { getToken, isLoaded } = useAuth();
  const { user, isSignedIn } = useUser();
  const setUser = useAppStore((s) => s.setUser);
  const logout = useAppStore((s) => s.logout);

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
    } else {
      logout();
    }
  }, [isLoaded, isSignedIn, user, setUser, logout]);

  return null;
}

// Gate for the private dashboard — bounce signed-out visitors to sign-in.
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
      signInUrl="/login"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <BrowserRouter>
        <AuthSync />
        <div className="min-h-screen bg-cream text-ink">
          <Navigation />
          <main>
            {/* Each page owns its own vertical rhythm. */}
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route path="/flexible" element={<FlexibleDates />} />
              <Route path="/optimize" element={<Step2_Optimization />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ClerkProvider>
  );
}
