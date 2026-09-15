import { and, eq, isNull, lt } from "drizzle-orm";
import { db, bookings, tours, tourSlots } from "@workspace/db";
import { logger } from "./logger";
import { notifyTripReminder } from "./notify";
import { releaseBookingCapacity } from "./booking";
import { runDueReports } from "./scheduled-reports";
import { pruneAnalytics } from "./analytics";

/** IST is UTC+5:30 and has no daylight saving — a fixed offset is exact. */
function tomorrowIst(): string {
  const ist = new Date(Date.now() + 5.5 * 3600e3);
  ist.setUTCDate(ist.getUTCDate() + 1);
  return ist.toISOString().slice(0, 10);
}

/**
 * Messages every confirmed booking whose trip is tomorrow and hasn't been
 * reminded yet. Marks `reminderSentAt` immediately per booking (before the
 * send) so a slow/failed send can't cause a duplicate on the next tick —
 * matches the fire-and-forget, never-throws contract the rest of notify.ts
 * follows for outbound messages.
 */
export async function sendTripReminders(): Promise<void> {
  const date = tomorrowIst();
  const rows = await db
    .select({ booking: bookings, tour: tours, slot: tourSlots })
    .from(bookings)
    .innerJoin(tourSlots, eq(bookings.slotId, tourSlots.id))
    .leftJoin(tours, eq(bookings.tourId, tours.id))
    .where(and(eq(bookings.status, "confirmed"), isNull(bookings.reminderSentAt), eq(tourSlots.date, date)));

  for (const { booking, tour, slot } of rows) {
    try {
      await db.update(bookings).set({ reminderSentAt: new Date() }).where(eq(bookings.id, booking.id));
      await notifyTripReminder({
        bookingRef: booking.bookingRef,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        tourTitle: tour?.title ?? "your tour",
        when: `${slot.date} ${slot.startTime}`,
        numGuests: booking.numGuests,
      });
    } catch (err) {
      logger.error({ err, bookingId: booking.id }, "trip reminder failed");
    }
  }

  if (rows.length > 0) {
    logger.info({ count: rows.length, date }, "trip reminders sent");
  }
}

/**
 * How long a direct-mode checkout may sit unpaid before we call it abandoned.
 * Long enough to cover someone finishing a UPI payment on another device or
 * coming back after dinner; short enough that the seats don't sit dead through
 * a whole booking weekend.
 */
const ABANDON_AFTER_MS = 6 * 60 * 60 * 1000;

/**
 * Moves stale unpaid direct-mode bookings to "cart_abandoned" and gives their
 * seats back.
 *
 * Only direct-mode tours qualify: on an enquiry-mode tour, "pending and
 * unpaid" is the correct resting state for a booking waiting on the team, and
 * sweeping those would cancel live business.
 */
export async function sweepAbandonedCarts(): Promise<number> {
  const cutoff = new Date(Date.now() - ABANDON_AFTER_MS);
  const rows = await db
    .select({ booking: bookings })
    .from(bookings)
    .innerJoin(tours, eq(bookings.tourId, tours.id))
    .where(
      and(
        eq(bookings.status, "pending"),
        eq(bookings.paymentStatus, "unpaid"),
        eq(tours.bookingMode, "direct"),
        lt(bookings.createdAt, cutoff),
      ),
    );

  for (const { booking } of rows) {
    try {
      await releaseBookingCapacity(booking.id);
      await db
        .update(bookings)
        .set({ status: "cart_abandoned", updatedAt: new Date() })
        .where(eq(bookings.id, booking.id));
    } catch (err) {
      logger.error({ err, bookingId: booking.id }, "cart abandon sweep failed for booking");
    }
  }
  if (rows.length > 0) {
    logger.info({ count: rows.length }, "bookings marked cart_abandoned");
  }
  return rows.length;
}

/** Runs sendTripReminders on a fixed interval for the life of the process —
 *  this API runs as a single always-on ECS task, so an in-process timer is
 *  sufficient and avoids standing up separate cron infrastructure. */
export function startReminderScheduler(): void {
  const INTERVAL_MS = 30 * 60 * 1000;
  const tick = () => {
    sendTripReminders().catch((err) => logger.error({ err }, "trip reminder scheduler tick failed"));
    sweepAbandonedCarts().catch((err) => logger.error({ err }, "cart abandon sweep tick failed"));
    runDueReports().catch((err) => logger.error({ err }, "scheduled report tick failed"));
  };
  tick();
  setInterval(tick, INTERVAL_MS);

  // Analytics retention runs far less often than the rest — once a day is
  // plenty for a table that only grows by pageviews.
  const pruneDaily = () => {
    pruneAnalytics()
      .then((n) => { if (n > 0) logger.info({ deleted: n }, "pruned old analytics events"); })
      .catch((err) => logger.error({ err }, "analytics prune failed"));
  };
  pruneDaily();
  setInterval(pruneDaily, 24 * 60 * 60 * 1000);
}
