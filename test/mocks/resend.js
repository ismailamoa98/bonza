// test/mocks/resend.js — Phase 23. The resend mock: capture-and-succeed, never send. Exposes the shared
// `sendSpy` so a test can assert an email was dispatched with the right data (per 23g, email *content*
// is covered in E2E; here we assert dispatch). Includes a rejection variant.
// Usage (hoisting-safe): vi.mock("resend", () => resendMock())
import { vi } from "vitest";

// Shared spy so tests can assert dispatches: `import { sendSpy } from "../mocks/resend.js"`.
export const sendSpy = vi.fn().mockResolvedValue({ data: { id: "re_test" }, error: null });

export function resendMock() {
  return { Resend: vi.fn(() => ({ emails: { send: sendSpy } })) };
}

// Rejection variant — the provider fails. emailService.createAndSend must still write the in-app row.
export function resendRejectMock(err = new Error("resend 500")) {
  return { Resend: vi.fn(() => ({ emails: { send: vi.fn().mockRejectedValue(err) } })) };
}
