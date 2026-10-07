// test/mocks/index.js — Phase 23. Barrel for the third-party mocks. Three rules (per spec 23b):
//  1. Return the shape the real API returns, including fields the code ignores.
//  2. Every mock has a failure variant (…DownMock / …RejectMock).
//  3. Anthropic mocks return parseable JSON matching the prompt contract (prose is the failure case).
// Each `xMock()` returns a module object; use hoisting-safe: vi.mock(id, () => xMock()).
export * as anthropic from "./anthropic.js";
export * as clerk from "./clerk.js";
export * as resend from "./resend.js";
export * as duffel from "./duffel.js";
export * as seatsAero from "./seatsAero.js";
export * as roomsAero from "./roomsAero.js";
export * as stripe from "./stripe.js";
