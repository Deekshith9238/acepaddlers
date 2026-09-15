import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, payments, bookings, tours } from "@workspace/db";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("finance"));

// Every payment attempt across every booking — the provider-side audit trail
// (bookings.paymentStatus stays the source of truth for whether a booking
// itself is paid; a booking can have more than one row here, e.g. an expired
// link followed by a fresh one).
router.get("/payments", async (_req, res) => {
  const rows = await db
    .select({ payment: payments, booking: bookings, tour: tours })
    .from(payments)
    .leftJoin(bookings, eq(payments.bookingId, bookings.id))
    .leftJoin(tours, eq(bookings.tourId, tours.id))
    .orderBy(desc(payments.createdAt));

  res.json(
    rows.map(({ payment, booking, tour }) => ({
      id: payment.id,
      bookingId: payment.bookingId,
      bookingRef: booking?.bookingRef ?? null,
      customerName: booking?.customerName ?? null,
      tourTitle: tour?.title ?? null,
      provider: payment.provider,
      providerLinkId: payment.providerLinkId,
      providerPaymentId: payment.providerPaymentId,
      shortUrl: payment.shortUrl,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    })),
  );
});

export default router;
