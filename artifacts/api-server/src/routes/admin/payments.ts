import { Router, type IRouter } from "express";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db, payments, bookings, tours } from "@workspace/db";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { likeTerm, paged, qstr, readPage } from "../../lib/paging";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("finance"));

// Every payment attempt across every booking — the provider-side audit trail
// (bookings.paymentStatus stays the source of truth for whether a booking
// itself is paid; a booking can have more than one row here, e.g. an expired
// link followed by a fresh one).
router.get("/payments", async (req, res) => {
  const where: SQL[] = [];
  const q = qstr(req.query.q);
  if (q) {
    const like = likeTerm(q);
    const term = or(
      ilike(bookings.bookingRef, like),
      ilike(bookings.customerName, like),
      ilike(payments.providerPaymentId, like),
      ilike(payments.providerLinkId, like),
      ilike(payments.reference, like),
    );
    if (term) where.push(term);
  }
  const status = qstr(req.query.status);
  if (status) where.push(eq(payments.status, status));
  const provider = qstr(req.query.provider);
  if (provider) where.push(eq(payments.provider, provider));
  const kind = qstr(req.query.kind);
  if (kind) where.push(eq(payments.kind, kind));
  const from = qstr(req.query.from);
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) where.push(gte(sql`${payments.createdAt}::date`, from));
  const to = qstr(req.query.to);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) where.push(lte(sql`${payments.createdAt}::date`, to));
  const cond = where.length > 0 ? and(...where) : undefined;

  const base = db
    .select({ payment: payments, booking: bookings, tour: tours })
    .from(payments)
    .leftJoin(bookings, eq(payments.bookingId, bookings.id))
    .leftJoin(tours, eq(bookings.tourId, tours.id))
    .where(cond)
    .orderBy(desc(payments.createdAt), desc(payments.id));
  const page = readPage(req.query as Record<string, unknown>);
  const rows = page ? await base.limit(page.limit).offset(page.offset) : await base;

  const items = rows.map(({ payment, booking, tour }) => ({
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
    kind: payment.kind,
    createdAt: payment.createdAt.toISOString(),
  }));
  if (!page) return void res.json(items);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(payments)
    .leftJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(cond);
  res.json(paged(items, Number(n), page));
});

export default router;
