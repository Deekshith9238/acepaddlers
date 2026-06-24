import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, tours, tourSlots, bookings } from "@workspace/db";
import {
  GenerateSlotsBody,
  UpdateSlotBody,
  UpdateBookingStatusBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { toBookingDetail, releaseBookingCapacity } from "../../lib/booking";
import { getCalendarClient } from "../../lib/calendar";

const router: IRouter = Router();
router.use(requireAdmin);

function toSlot(s: typeof tourSlots.$inferSelect) {
  return {
    id: s.id,
    tourId: s.tourId,
    date: s.date,
    startTime: s.startTime,
    capacity: s.capacity,
    bookedCount: s.bookedCount,
    remaining: s.capacity - s.bookedCount,
    status: s.status,
  };
}

// ── Slots ──
router.get("/slots", async (req, res) => {
  const tourId = req.query.tourId;
  if (typeof tourId !== "string") {
    res.status(400).json({ error: "tourId_required" });
    return;
  }
  const conds = [eq(tourSlots.tourId, tourId)];
  if (typeof req.query.from === "string") conds.push(gte(tourSlots.date, req.query.from));
  if (typeof req.query.to === "string") conds.push(lte(tourSlots.date, req.query.to));
  const rows = await db
    .select()
    .from(tourSlots)
    .where(and(...conds))
    .orderBy(asc(tourSlots.date), asc(tourSlots.startTime));
  res.json(rows.map(toSlot));
});

router.post("/tours/:id/slots/generate", async (req, res) => {
  const parsed = GenerateSlotsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [tour] = await db.select({ id: tours.id }).from(tours).where(eq(tours.id, req.params.id)).limit(1);
  if (!tour) {
    res.status(404).json({ error: "tour_not_found" });
    return;
  }
  const { from, to, weekdays, startTime, capacity } = parsed.data;
  const values: (typeof tourSlots.$inferInsert)[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    if (weekdays.includes(d.getUTCDay())) {
      values.push({ tourId: tour.id, date: d.toISOString().slice(0, 10), startTime, capacity });
    }
  }
  if (values.length === 0) {
    res.json({ created: 0 });
    return;
  }
  const inserted = await db
    .insert(tourSlots)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: tourSlots.id });
  res.json({ created: inserted.length });
});

router.patch("/slots/:id", async (req, res) => {
  const parsed = UpdateSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [row] = await db
    .update(tourSlots)
    .set(parsed.data as Partial<typeof tourSlots.$inferInsert>)
    .where(eq(tourSlots.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(toSlot(row));
});

router.delete("/slots/:id", async (req, res) => {
  const [row] = await db
    .delete(tourSlots)
    .where(eq(tourSlots.id, req.params.id))
    .returning({ id: tourSlots.id });
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

// ── Bookings ──
router.get("/bookings", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : null;
  const rows = await db
    .select({ b: bookings, t: tours, s: tourSlots })
    .from(bookings)
    .leftJoin(tours, eq(bookings.tourId, tours.id))
    .leftJoin(tourSlots, eq(bookings.slotId, tourSlots.id))
    .where(status ? eq(bookings.status, status as typeof bookings.$inferSelect.status) : sql`true`)
    .orderBy(desc(bookings.createdAt));
  res.json(rows.map((r) => toBookingDetail(r.b, r.t, r.s)));
});

router.patch("/bookings/:id", async (req, res) => {
  const parsed = UpdateBookingStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [existing] = await db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const newStatus = parsed.data.status;
  const [tour] = await db.select().from(tours).where(eq(tours.id, existing.tourId)).limit(1);
  const [slot] = await db.select().from(tourSlots).where(eq(tourSlots.id, existing.slotId)).limit(1);

  // Calendar sync: create on confirm, delete on cancel. Never let it break the
  // status change — failures are logged inside the client.
  let googleEventId = existing.googleEventId;
  const calendar = await getCalendarClient();
  if (newStatus === "confirmed" && existing.status !== "confirmed" && !googleEventId && slot) {
    googleEventId = await calendar.createEvent({
      summary: tour?.title ?? "Ace Paddlers booking",
      description: `Booking ${existing.bookingRef} — ${existing.customerName} (${existing.numGuests} guest(s)). ${existing.customerEmail} · ${existing.customerPhone}`,
      location: tour?.location ?? "",
      date: slot.date,
      startTime: slot.startTime,
    });
  }
  if (newStatus === "cancelled" && existing.status !== "cancelled") {
    await releaseBookingCapacity(existing.id);
    if (existing.googleEventId) {
      await calendar.deleteEvent(existing.googleEventId);
      googleEventId = null;
    }
  }

  const [updated] = await db
    .update(bookings)
    .set({ status: newStatus, googleEventId, updatedAt: new Date() })
    .where(eq(bookings.id, req.params.id))
    .returning();
  res.json(toBookingDetail(updated, tour, slot));
});

export default router;
