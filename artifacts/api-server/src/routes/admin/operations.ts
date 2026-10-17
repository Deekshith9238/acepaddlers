import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, inArray, lte, ne, or, sql, ilike } from "drizzle-orm";
import { db, tours, tourSlots, tourVariants, bookings } from "@workspace/db";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { TOUR_TIMEZONE } from "../../lib/tour-editor";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("bookings"));

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Every departure in a window, with how full it is.
 *
 * The list, weekly and monthly views of the operations dashboard are the same
 * question over different windows, so they share one endpoint and the client
 * groups. Cancelled bookings are excluded from the head count — the crew needs
 * to know who is actually turning up, not what was once sold.
 */
router.get("/operations", async (req, res) => {
  const { from, to } = req.query;
  if (typeof from !== "string" || typeof to !== "string" || !DATE.test(from) || !DATE.test(to) || from > to) {
    res.status(400).json({ error: "bad_range" });
    return;
  }

  const slots = await db
    .select({ s: tourSlots, t: tours, v: tourVariants })
    .from(tourSlots)
    .innerJoin(tours, eq(tourSlots.tourId, tours.id))
    .leftJoin(tourVariants, eq(tourSlots.variantId, tourVariants.id))
    .where(and(gte(tourSlots.date, from), lte(tourSlots.date, to)))
    .orderBy(asc(tourSlots.date), asc(tourSlots.startTime), asc(tours.title));

  const slotIds = slots.map((r) => r.s.id);
  // One grouped pass rather than a correlated subquery per row: the aggregate
  // has to be keyed on the slot, and a bare column reference inside a
  // subquery binds to the wrong table in a single-table query.
  const counts = slotIds.length
    ? await db
        .select({
          slotId: bookings.slotId,
          bookings: sql<number>`count(*)::int`,
          guests: sql<number>`coalesce(sum(${bookings.numGuests}), 0)::int`,
        })
        .from(bookings)
        .where(and(inArray(bookings.slotId, slotIds), ne(bookings.status, "cancelled")))
        .groupBy(bookings.slotId)
    : [];
  const bySlot = new Map(counts.map((c) => [c.slotId, c]));

  res.json({
    from,
    to,
    timezone: TOUR_TIMEZONE,
    departures: slots.map(({ s, t, v }) => {
      const c = bySlot.get(s.id);
      return {
        slotId: s.id,
        tourId: t.id,
        tourTitle: t.title,
        tourCode: t.code,
        variantLabel: v?.label ?? null,
        date: String(s.date),
        startTime: s.startTime,
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        status: s.status,
        bookings: Number(c?.bookings ?? 0),
        guests: Number(c?.guests ?? 0),
      };
    }),
  });
});

/**
 * The header search: a booking reference, or any passenger's name, email or
 * phone. Phone is matched on digits alone so "+91 99660 19843" finds a booking
 * saved as "9966019843".
 */
router.get("/booking-search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.json([]);
    return;
  }
  const like = `%${q}%`;
  const digits = q.replace(/\D/g, "");

  const conds = [
    ilike(bookings.bookingRef, like),
    ilike(bookings.customerName, like),
    ilike(bookings.customerEmail, like),
  ];
  if (digits.length >= 4) {
    // Compare on the last 10 digits, the same way customer identity is matched:
    // staff paste "+91 9551 095085" but the booking stores "9551095085", and a
    // naive contains-search finds nothing because of the country code.
    const tail = digits.slice(-10);
    conds.push(
      sql`right(regexp_replace(${bookings.customerPhone}, '[^0-9]', '', 'g'), 10) like ${`%${tail}%`}`,
    );
  }

  const rows = await db
    .select({ b: bookings, t: tours, s: tourSlots })
    .from(bookings)
    .leftJoin(tours, eq(bookings.tourId, tours.id))
    .leftJoin(tourSlots, eq(bookings.slotId, tourSlots.id))
    .where(or(...conds))
    .orderBy(desc(bookings.createdAt))
    .limit(20);

  res.json(
    rows.map(({ b, t, s }) => ({
      id: b.id,
      bookingRef: b.bookingRef,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,
      tourTitle: t?.title ?? null,
      date: s ? String(s.date) : null,
      startTime: s?.startTime ?? null,
      status: b.status,
      numGuests: b.numGuests,
    })),
  );
});

export default router;
