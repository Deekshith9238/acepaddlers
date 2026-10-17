import { eq } from "drizzle-orm";
import { db, bookings, payments, tours, tourSlots } from "@workspace/db";
import { createPaymentLink } from "./razorpay";
import { bookingPaymentSummary } from "./payments-ledger";
import { paymentDueAt } from "./trip-rules";
import { notifyPaymentLink } from "./notify";
import { logger } from "./logger";

export class PaymentLinkError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

/**
 * Raise a Razorpay payment link for a booking and send it to the customer —
 * the admin's "Send payment link", and what an agent's booking does on its own.
 *
 * Asks for what is still owed, not the sticker price: with deposits a booking
 * can already be part-paid, and the ledger is the authority on the balance.
 * Throws PaymentProviderError when Razorpay refuses; a notification that fails
 * to send does not fail the link, which the caller still gets back.
 */
export async function sendBookingPaymentLink(bookingId: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) throw new PaymentLinkError("not_found", 404);
  if (booking.paymentStatus === "paid") throw new PaymentLinkError("already_paid", 409);
  const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId)).limit(1);
  const [slot] = await db.select().from(tourSlots).where(eq(tourSlots.id, booking.slotId)).limit(1);

  const summary = await bookingPaymentSummary(booking.id);
  const amountDue = summary.due > 0 ? summary.due : booking.totalAmount;

  const link = await createPaymentLink({
    bookingRef: booking.bookingRef,
    amount: amountDue,
    currency: booking.currency,
    // The trip's payment deadline, so an unpaid hold does not sit open forever.
    expiresAt: tour ? paymentDueAt(tour) : null,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    description: `${tour?.title ?? "Ace Paddlers booking"} — ${booking.bookingRef}`,
  });

  const [payment] = await db
    .insert(payments)
    .values({
      bookingId: booking.id,
      provider: "razorpay",
      providerLinkId: link.id,
      shortUrl: link.shortUrl,
      amount: booking.totalAmount,
      currency: booking.currency,
      status: link.status,
    })
    .returning();

  try {
    await notifyPaymentLink({
      bookingRef: booking.bookingRef,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      tourTitle: tour?.title ?? "your tour",
      date: slot?.date ?? null,
      startTime: slot?.startTime ?? null,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      paymentUrl: link.shortUrl,
    });
  } catch (err) {
    logger.error({ err, bookingId: booking.id }, "payment link notification failed");
  }

  return { booking, tour, slot, payment, url: link.shortUrl };
}
