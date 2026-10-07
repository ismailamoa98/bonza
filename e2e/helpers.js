// e2e/helpers.js — Phase 23. Shared E2E flags + exports. The app requires Clerk test keys to boot and a
// signed-in session for the money/points flows; Stripe webhook replay needs Stripe test keys + the CLI.
// Specs self-skip when those aren't configured, so a run without secrets stays green instead of erroring.
import { test, expect } from "@playwright/test";

export const AUTH_READY = Boolean(process.env.E2E_CLERK_EMAIL && process.env.E2E_CLERK_PASSWORD);
export const STRIPE_READY = /^sk_test_/.test(process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "");

export { test, expect };
