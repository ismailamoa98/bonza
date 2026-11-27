// test/helpers/auth.js — Phase 23. Switch the acting user by steering the mocked Clerk getAuth.
import { getAuth } from "@clerk/express";

export function asUser(userId) {
  getAuth.mockReturnValue({ userId });
}
export function asGuest() {
  getAuth.mockReturnValue({ userId: null });
}
