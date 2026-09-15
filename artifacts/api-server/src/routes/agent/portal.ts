import { Router, type IRouter } from "express";
import { and, count, desc, eq, gte, ilike, ne, or, sql, sum } from "drizzle-orm";
import { db, agents, bookings, tours, tourSlots, tourVariants } from "@workspace/db";
import { requireAgent, currentAgent } from "../../middlewares/requireAgent";

const router: IRouter = Router();
router.use(requireAgent);

/**
 * Everything here reads `res.locals.agent.id` and nothing else.
 *
 * There is deliberately no way to name an agent in a request: the only agent a
 * caller can ever see is the one their session resolves to.
 */

router.get("/summary", async (_req, res) => {
  const me = currentAgent(res);
  const today = new Date().toISOString().slice(0, 10);

  const [totals, upcoming] = await Promise.all([
    db
      .select({
        totalBookings: count(),
        totalValue: sum(bookings.totalAmount).mapWith(Number),
        // ISO 8601, not Postgres' own text format: "2026-09-05 06:33:36+00" is
      // parsed by Chrome but rejected by Safari, and this value is formatted
      // client-side.
      lastBookingDate: sql<string | null>`to_char(max(${bookings.createdAt}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      })
      .from(bookings)
      .where(and(eq(bookings.agentId, me.id), ne(bookings.status, "cancelled"))),
    db
      .select({ n: count() })
      .from(bookings)
      .innerJoin(tourSlots, eq(bookings.slotId, tourSlots.id))
      .where(and(eq(bookings.agentId, me.id), ne(bookings.status, "cancelled"), gte(tourSlots.date, today))),
  ]);

  const totalValue = Number(totals[0]?.totalValue ?? 0);
  res.json({
    totalBookings: Number(totals[0]?.totalBookings ?? 0),
    totalValue,
    commissionPercent: me.commissionPercent,
    commissionValue: Math.round((totalValue * me.commissionPercent) / 100),
    upcomingDepartures: Number(upcoming[0]?.n ?? 0),
    lastBookingDate: totals[0]?.lastBookingDate ?? null,
  });
});

router.get("/bookings", async (req, res) => {
  const me = currentAgent(res);
  const status = typeof req.query.status === "string" && req.query.status.trim() ? req.query.status.trim() : "";
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const where = [eq(bookings.agentId, me.id)];
  if (status === "open") where.push(sql`${bookings.status} in ('pending','confirmed')`);
  else if (status) where.push(eq(bookings.status, status as never));
  if (q) {
    const like = `%${q}%`;
    const term = or(
      ilike(bookings.bookingRef, like),
      ilike(bookings.customerName, like),
      ilike(bookings.customerEmail, like),
      ilike(bookings.customerPhone, like),
    );
    if (term) where.push(term);
  }

  const rows = await db
    .select({ b: bookings, t: tours, s: tourSlots, v: tourVariants })
    .from(bookings)
    .leftJoin(tours, eq(bookings.tourId, tours.id))
    .leftJoin(tourSlots, eq(bookings.slotId, tourSlots.id))
    .leftJoin(tourVariants, eq(bookings.variantId, tourVariants.id))
    .where(and(...where))
    .orderBy(desc(bookings.createdAt));

  // A narrower shape than the admin's booking record on purpose: an agent has
  // no business seeing the payment ledger, internal notes or staff tags on a
  // booking, only what they sold and what it earns them.
  res.json(
    rows.map(({ b, t, s, v }) => ({
      id: b.id,
      bookingRef: b.bookingRef,
      tourTitle: t?.title ?? null,
      tourCode: t?.code ?? null,
      variantLabel: v?.label ?? null,
      date: s ? String(s.date) : null,
      startTime: s?.startTime ?? null,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,
      numGuests: b.numGuests,
      totalAmount: b.totalAmount,
      currency: b.currency,
      status: b.status,
      commissionValue:
        b.status === "cancelled" ? 0 : Math.round((b.totalAmount * me.commissionPercent) / 100),
      createdAt: b.createdAt.toISOString(),
    })),
  );
});

export default router;
