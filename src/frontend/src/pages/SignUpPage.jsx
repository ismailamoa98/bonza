// pages/SignUpPage.jsx — branded sign-up (route /sign-up/*). Same shell as sign-in with the "get started"
// copy and a points-forward slideshow headline. After sign-up Clerk routes to /onboarding (ClerkProvider
// signUpFallbackRedirectUrl).
import { useState } from "react";
import { SignUp } from "@clerk/clerk-react";
import AuthLayout from "../components/auth/AuthLayout";
import { clerkAppearance } from "../config/clerkAppearance";
import TurnstileWidget, { turnstileEnabled, TURNSTILE_DISABLED } from "../components/security/TurnstileWidget";
import { verifyTurnstile } from "../utils/api";

// §27d — a soft bot gate in front of the Clerk sign-up form. When Turnstile is configured, the challenge must
// pass (verified server-side) before the form is revealed; offline (no site key) the form renders directly.
function TurnstileGate({ children }) {
  const [passed, setPassed] = useState(!turnstileEnabled);

  const onToken = async (token) => {
    if (token === TURNSTILE_DISABLED) return setPassed(true);
    if (!token) return;
    try {
      const { ok } = await verifyTurnstile(token);
      setPassed(Boolean(ok));
    } catch {
      setPassed(false);
    }
  };

  if (passed) return children;
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-[13px] text-ink-muted">Quick check before you get started.</p>
      <TurnstileWidget onToken={onToken} action="sign_up" />
    </div>
  );
}

const SIGNUP_SLIDE = {
  heading: (
    <>
      Where will your <em className="not-italic text-[#F2BC9F]">points</em> take you?
    </>
  ),
  body: "Connect your loyalty accounts and Bonza finds the best use of every point you hold.",
};

export default function SignUpPage() {
  return (
    <AuthLayout
      eyebrow="GET STARTED"
      title="Create your account"
      subtitle={
        <>
          Already have one?{" "}
          <a href="/sign-in" className="text-bonza font-semibold">
            Sign in
          </a>
        </>
      }
      slide={SIGNUP_SLIDE}
    >
      <TurnstileGate>
        <SignUp path="/sign-up" routing="path" appearance={clerkAppearance} signInUrl="/sign-in" />
      </TurnstileGate>
      {/* Phase 25 §25d — explicit consent disclosure. Creating the account is the affirmative act; the server
          records acceptance of Terms + Privacy at the current version (ensureUser / Clerk webhook). */}
      <p className="mx-auto mt-4 max-w-[22rem] text-center text-[12.5px] leading-relaxed text-ink-muted">
        By creating an account you agree to our{" "}
        <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-bonza hover:text-bonza-dark">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-bonza hover:text-bonza-dark">
          Privacy Policy
        </a>
        . Bonza is for adults (18+).
      </p>
    </AuthLayout>
  );
}
