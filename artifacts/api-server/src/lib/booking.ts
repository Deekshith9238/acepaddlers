import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, tours, tourSlots, bookings } from "@workspace/db";
import type { BookingDetail } from "@workspace/api-zod";

export class BookingError extends Error {
  status: number;
  code: string;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
export function generateBookingRef(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `AP-${s}`;
}

type BookingRow = typeof bookings.$inferSelect;
type TourRow = typeof tours.$inferSelect;
type SlotRow = typeof tourSlots.$inferSelect;

export function toBookingDetail(b: BookingRow, tour?: TourRow | null, slot?: SlotRow | null): BookingDetail {
  return {
    id: b.id,
    bookingRef: b.bookingRef,
    tourId: b.tourId,
    tourSlug: tour?.slug ?? null,
    tourTitle: tour?.title ?? null,
    slotId: b.slotId,
    date: slot?.date ?? null,
    startTime: slot?.startTime ?? null,
    location: tour?.location ?? null,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    numGuests: b.numGuests,
    totalAmount: b.totalAmount,
    currency: b.currency,
    status: b.status,
    paymentStatus: b.paymentStatus,
    createdAt: b.createdAt ? b.createdAt.toISOString() : null,
  };
}

export interface CreateBookingInput {
  slotId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  numGuests: number;
  guestDetails?: { name?: string; age?: number; weightKg?: number }[];
  notes?: string | null;
}

/** Create a booking, atomically locking and decrementing slot capacity. */
export async function createBooking(input: CreateBookingInput): Promise<{
  booking: BookingRow;
  tour: TourRow;
  slot: SlotRow;
}> {
  if (input.numGuests < 1) throw new BookingError("invalid_guests", 400);

  return db.transaction(async (tx) => {
    // Lock the slot row so concurrent bookings can't oversell it.
    const [slot] = await tx
      .select()
      .from(tourSlots)
      .where(eq(tourSlots.id, input.slotId))
      .for("update");
    if (!slot) throw new BookingError("slot_not_found", 404);
    if (slot.status !== "open") throw new BookingError("slot_unavailable", 409);
    if (slot.bookedCount + input.numGuests > slot.capacity) {
      throw new BookingError("insufficient_capacity", 409);
    }

    const [tour] = await tx.select().from(tours).where(eq(tours.id, slot.tourId)).limit(1);
    if (!tour) throw new BookingError("tour_not_found", 404);

    const newBooked = slot.bookedCount + input.numGuests;
    const [booking] = await tx
      .insert(bookings)
      .values({
        bookingRef: generateBookingRef(),
        tourId: tour.id,
        slotId: slot.id,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        numGuests: input.numGuests,
        guestDetails: input.guestDetails ?? [],
        totalAmount: tour.priceValue * input.numGuests,
        currency: tour.currency,
        status: "pending",
        paymentStatus: "unpaid",
        notes: input.notes ?? null,
      })
      .returning();

    await tx
      .update(tourSlots)
      .set({ bookedCount: newBooked, status: newBooked >= slot.capacity ? "full" : "open" })
      .where(eq(tourSlots.id, slot.id));

    return { booking, tour, slot: { ...slot, bookedCount: newBooked } };
  });
}

/** Release a cancelled booking's seats back to its slot. */
export async function releaseBookingCapacity(bookingId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!b) return;
    const [slot] = await tx.select().from(tourSlots).where(eq(tourSlots.id, b.slotId)).for("update");
    if (!slot) return;
    const newBooked = Math.max(0, slot.bookedCount - b.numGuests);
    await tx
      .update(tourSlots)
      .set({ bookedCount: newBooked, status: newBooked < slot.capacity ? "open" : slot.status })
      .where(eq(tourSlots.id, slot.id));
  });
}
