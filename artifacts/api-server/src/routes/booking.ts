import { Router, type IRouter } from "express";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db, tours, tourSlots, bookings } from "@workspace/db";
import { CreateBookingBody } from "@workspace/api-zod";
import { createBooking, toBookingDetail, BookingError } from "../lib/booking";
import { notifyNewBooking } from "../lib/notify";

const router: IRouter = Router();

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Public availability: open slots with remaining capacity for a tour.
router.get("/availability", async (req, res) => {
  const slug = req.query.tour;
  if (typeof slug !== "string" || !slug) {
    res.status(400).json({ error: "tour_required" });
    return;
  }
  const [tour] = await db
    .select()
    .from(tours)
    .where(and(eq(tours.slug, slug), eq(tours.status, "published")))
    .limit(1);
  if (!tour) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const from = typeof req.query.from === "string" ? req.query.from : today;
  const to = typeof req.query.to === "string" ? req.query.to : addDays(today, 90);

  const rows = await db
    .select()
    .from(tourSlots)
    .where(
      and(
        eq(tourSlots.tourId, tour.id),
        eq(tourSlots.status, "open"),
        gte(tourSlots.date, from),
        lte(tourSlots.date, to),
      ),
    )
    .orderBy(asc(tourSlots.date), asc(tourSlots.startTime));

  const slots = rows
    .filter((s) => s.bookedCount < s.capacity)
    .map((s) => ({
      id: s.id,
      tourId: s.tourId,
      date: s.date,
      startTime: s.startTime,
      capacity: s.capacity,
      bookedCount: s.bookedCount,
      remaining: s.capacity - s.bookedCount,
      status: s.status,
    }));
  res.json(slots);
});

router.post("/bookings", async (req, res) => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  try {
    const { booking, tour, slot } = await createBooking(parsed.data);
    const detail = toBookingDetail(booking, tour, slot);
    // Fire-and-forget notifications — never block/break the booking on these.
    notifyNewBooking({
      bookingRef: detail.bookingRef,
      customerName: detail.customerName,
      customerEmail: detail.customerEmail,
      customerPhone: detail.customerPhone,
      tourTitle: detail.tourTitle ?? "",
      date: detail.date ?? null,
      startTime: detail.startTime ?? null,
      numGuests: detail.numGuests,
      totalAmount: detail.totalAmount,
      currency: detail.currency,
    }).catch(() => undefined);
    res.status(201).json(detail);
  } catch (e) {
    if (e instanceof BookingError) {
      res.status(e.status).json({ error: e.code });
      return;
    }
    throw e;
  }
});

async function loadBookingByRef(ref: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.bookingRef, ref)).limit(1);
  if (!booking) return null;
  const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId)).limit(1);
  const [slot] = await db.select().from(tourSlots).where(eq(tourSlots.id, booking.slotId)).limit(1);
  return { booking, tour, slot };
}

router.get("/bookings/:ref", async (req, res) => {
  const found = await loadBookingByRef(req.params.ref);
  if (!found) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(toBookingDetail(found.booking, found.tour, found.slot));
});

function icsEscape(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

router.get("/bookings/:ref/calendar.ics", async (req, res) => {
  const found = await loadBookingByRef(req.params.ref);
  if (!found || !found.slot) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const { booking, tour, slot } = found;
  const start = `${slot.date.replace(/-/g, "")}T${(slot.startTime || "09:00").replace(":", "")}00`;
  // +2h end
  const [h, m] = (slot.startTime || "09:00").split(":").map(Number);
  const endH = String((h + 2) % 24).padStart(2, "0");
  const end = `${slot.date.replace(/-/g, "")}T${endH}${String(m).padStart(2, "0")}00`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ace Paddlers//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${booking.bookingRef}@acepaddlers`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(tour?.title ?? "Ace Paddlers booking")}`,
    `DESCRIPTION:${icsEscape(`Booking ${booking.bookingRef} for ${booking.numGuests} guest(s).`)}`,
    `LOCATION:${icsEscape(tour?.location ?? "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${booking.bookingRef}.ics"`);
  res.send(ics);
});

export default router;
