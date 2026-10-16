// pages/SignUpPage.jsx — branded sign-up (route /sign-up/*). Same shell as sign-in with the "get started"
// copy and a points-forward slideshow headline. After sign-up Clerk routes to /onboarding (ClerkProvider
// signUpFallbackRedirectUrl).
import { SignUp } from "@clerk/clerk-react";
import AuthLayout from "../components/auth/AuthLayout";
import { clerkAppearance } from "../config/clerkAppearance";

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
      <SignUp path="/sign-up" routing="path" appearance={clerkAppearance} signInUrl="/sign-in" />
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
