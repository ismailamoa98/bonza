// test/setup/frontend.js — Phase 23. jsdom setup for the React component project: jest-dom matchers, and
// stubs for the heavy browser-only deps components pull in (Clerk, axios, MapLibre) so a component under
// test renders without network or WebGL. Only components with real logic are tested (no class-string snapshots).
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// Clerk React — a signed-out, loaded auth context by default.
vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ isSignedIn: false, isLoaded: true, user: null }),
  useAuth: () => ({ isSignedIn: false, isLoaded: true, getToken: async () => null }),
  SignedIn: () => null,
  SignedOut: ({ children }) => children,
  ClerkProvider: ({ children }) => children,
  RedirectToSignIn: () => null,
  useClerk: () => ({ openSignIn: vi.fn() }),
}));

// axios — never hit the network from a component test.
vi.mock("axios", () => {
  const inst = { get: vi.fn().mockResolvedValue({ data: {} }), post: vi.fn().mockResolvedValue({ data: {} }), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };
  return { default: { ...inst, create: () => inst } };
});

// MapLibre GL — WebGL, not available in jsdom.
vi.mock("maplibre-gl", () => ({ default: { Map: vi.fn(() => ({ on: vi.fn(), remove: vi.fn(), addControl: vi.fn() })), NavigationControl: vi.fn() } }));

// matchMedia + scrollTo — jsdom doesn't implement them; some components call them on mount.
if (!window.matchMedia) {
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} });
}
window.scrollTo = window.scrollTo || (() => {});
