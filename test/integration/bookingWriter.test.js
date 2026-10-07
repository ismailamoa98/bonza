// test/integration/bookingWriter.test.js — Phase 23. The single writeBooking path every confirmed booking
// goes through: it writes the Booking row, awards cashback (cash legs only, first-booking/Pro rules), flips
// the journey, and records an append-only UserEvent. Called directly with a userId. DB-backed, offline.
import { describe, it, expect } from "vitest";
import { makeUser, makeProUser, prisma } from "../factories/index.js";

const { writeBooking } = require("../../src/backend/utils/bookingWriter");

const hotelLeg = {
  leg: "hotel",
  bookingType: "cash",
  supplier: "marriott_bonvoy",
  supplierReference: "MAR123",
  description: "Hotel · 4 nights",
  cashValueGbp: 300,
  confirmationMethod: "affiliate_handoff",
};

describe("writeBooking", () => {
  it("creates a confirmed Booking row for the user", async () => {
    const u = await makeUser();
    const b = await writeBooking(u.id, hotelLeg);
    expect(b.id).toBeTruthy();
    expect(b.status).toBe("confirmed");
    expect(await prisma.booking.count({ where: { userId: u.id } })).toBe(1);
  });

  it("awards 3% cashback on a first cash hotel booking and stamps creditsAwarded", async () => {
    const u = await makeUser();
    const b = await writeBooking(u.id, hotelLeg);
    expect(b.creditsAwarded).toBeCloseTo(9, 5); // 3% of £300
    const credits = await prisma.bonzaCredit.findMany({ where: { userId: u.id } });
    expect(credits).toHaveLength(1);
    expect(credits[0].amount).toBeCloseTo(9, 5);
  });

  it("earns no cashback on a flight leg (flights don't earn Credits)", async () => {
    const u = await makeUser();
    const b = await writeBooking(u.id, { ...hotelLeg, leg: "flight", supplier: "duffel", confirmationMethod: "duffel" });
    expect(b.creditsAwarded == null).toBe(true);
    expect(await prisma.bonzaCredit.count({ where: { userId: u.id } })).toBe(0);
  });

  it("earns no cashback on a points booking (no cash paid)", async () => {
    const u = await makeUser();
    const b = await writeBooking(u.id, { leg: "hotel", bookingType: "points", supplier: "world_of_hyatt", pointsUsed: 40000, pointsProgramme: "world_of_hyatt", confirmationMethod: "self_reported" });
    expect(b.creditsAwarded == null).toBe(true);
    expect(await prisma.bonzaCredit.count({ where: { userId: u.id } })).toBe(0);
  });

  it("does not award a free user's second booking (first-booking-only)", async () => {
    const u = await makeUser();
    await writeBooking(u.id, hotelLeg); // first — free
    const second = await writeBooking(u.id, hotelLeg);
    expect(second.creditsAwarded == null).toBe(true);
    expect(await prisma.bonzaCredit.count({ where: { userId: u.id } })).toBe(1);
  });

  it("awards a Pro user's second booking", async () => {
    const u = await makeProUser();
    await writeBooking(u.id, hotelLeg);
    const second = await writeBooking(u.id, hotelLeg);
    expect(second.creditsAwarded).toBeCloseTo(9, 5);
  });

  it("records an append-only booking_confirmed event", async () => {
    const u = await makeUser();
    const b = await writeBooking(u.id, hotelLeg);
    const ev = await prisma.userEvent.findFirst({ where: { userId: u.id, type: "booking_confirmed" } });
    expect(ev).toBeTruthy();
    expect(ev.metadata.bookingId).toBe(b.id);
  });

  it("flips a linked journey to confirmed", async () => {
    const u = await makeUser();
    const journey = await prisma.userJourney.create({ data: { userId: u.id, origin: "LHR", destination: "LIS" } });
    await writeBooking(u.id, { ...hotelLeg, journeyId: journey.id });
    const after = await prisma.userJourney.findUnique({ where: { id: journey.id } });
    expect(after.bookingConfirmed).toBe(true);
    expect(after.bookingMethod).toBe("affiliate_handoff");
  });
});
