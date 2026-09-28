// pages/SignInPage.jsx — branded sign-in (route /sign-in/*). Clerk owns auth; AuthLayout + clerkAppearance
// supply the branded shell. Replaces the old bare-<SignIn> Login.jsx (Phase 7 §7f).
import { SignIn } from "@clerk/clerk-react";
import AuthLayout from "../components/auth/AuthLayout";
import { clerkAppearance } from "../config/clerkAppearance";

export default function SignInPage() {
  return (
    <AuthLayout
      eyebrow="SIGN IN"
      title="Sign in to Bonza"
      subtitle={
        <>
          New here?{" "}
          <a href="/sign-up" className="text-bonza font-semibold">
            Create an account
          </a>
        </>
      }
    >
      <SignIn path="/sign-in" routing="path" appearance={clerkAppearance} signUpUrl="/sign-up" />
    </AuthLayout>
  );
}
