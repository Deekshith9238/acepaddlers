import { and, eq, ne, sql } from "drizzle-orm";
import { tourSlots, tours, type db as Db } from "@workspace/db";

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];
type TourRow = typeof tours.$inferSelect;
type SlotRow = typeof tourSlots.$inferSelect;

/**
 * How a booking on one variant affects the other variants departing at the
 * same moment.
 *
 * Camp Karle is one site sold three ways — Rooms, Day Visit, Camping — off one
 * calendar. Whether those three compete for the same physical space is a
 * property of the trip, not of the software:
 *
 *   independent  Each variant has its own inventory. Selling out Camping says
 *                nothing about Rooms. (The behaviour before this existed.)
 *   reduces      They draw on one pool. Six people camping is six fewer the
 *                site can take in rooms that night.
 *   closes       The departure is exclusive. One booking of any variant takes
 *                the whole slot — a boat chartered for rafting cannot also be
 *                sold for kayaking.
 *
 * `sharedTrip = false` is the same idea at the trip level: a private departure
 * is bought whole, so the first booking closes it to everyone else.
 *
 * All of this runs inside the caller's transaction, holding the same lock that
 * protects the slot being booked — sibling rows are locked in the same
 * statement order (by id) on every path, so two concurrent bookings on
 * different variants of one departure cannot deadlock.
 */

/** Slots for the same tour, date and time, excluding the one booked. */
async function siblingSlots(tx: Tx, slot: SlotRow): Promise<SlotRow[]> {
  return tx
    .select()
    .from(tourSlots)
    .where(
      and(
        eq(tourSlots.tourId, slot.tourId),
        eq(tourSlots.date, slot.date),
        eq(tourSlots.startTime, slot.startTime),
        ne(tourSlots.id, slot.id),
      ),
    )
    .orderBy(tourSlots.id)
    .for("update");
}

/**
 * Apply a booking's seat movement to everything that shares the departure.
 *
 * `seatsDelta` is positive when seats are taken and negative when a
 * cancellation gives them back, so booking and release are the same code path
 * — the alternative was two near-identical functions that drift apart, which
 * on a capacity path means silently overselling.
 */
export async function applyDepartureSharing(
  tx: Tx,
  tour: Pick<TourRow, "seatSharing" | "sharedTrip">,
  slot: SlotRow,
  seatsDelta: number,
): Promise<void> {
  const mode = tour.seatSharing ?? "independent";
  const exclusive = tour.sharedTrip === false || mode === "closes";

  // Nothing to propagate, and nothing to close: the common case, and it must
  // stay as cheap as it was before variants existed.
  if (mode === "independent" && !exclusive) return;

  const siblings = await siblingSlots(tx, slot);
  if (siblings.length === 0 && !exclusive) return;

  if (mode === "reduces") {
    for (const sib of siblings) {
      // Clamped at zero and at capacity: a sibling's own count is only ever a
      // mirror of the shared pool, and letting it drift negative (or past
      // capacity on a rounding edge) would corrupt what it can sell next.
      const next = Math.min(Math.max(0, sib.bookedCount + seatsDelta), sib.capacity);
      await tx
        .update(tourSlots)
        .set({ bookedCount: next, status: next >= sib.capacity ? "full" : "open" })
        .where(eq(tourSlots.id, sib.id));
    }
  }

  if (exclusive) {
    /**
     * Derived, not toggled.
     *
     * Closing siblings on booking is easy; knowing whether to reopen them on
     * cancellation is not, because a second booking may still hold the
     * departure. So the state is recomputed from whether *anything* in the
     * group is now booked, which is correct however many bookings come and go.
     */
    const [{ booked }] = await tx
      .select({ booked: sql<number>`coalesce(sum(${tourSlots.bookedCount}), 0)::int` })
      .from(tourSlots)
      .where(
        and(
          eq(tourSlots.tourId, slot.tourId),
          eq(tourSlots.date, slot.date),
          eq(tourSlots.startTime, slot.startTime),
        ),
      );
    const taken = booked > 0;
    for (const sib of siblings) {
      await tx
        .update(tourSlots)
        .set({ status: taken ? "full" : sib.bookedCount >= sib.capacity ? "full" : "open" })
        .where(eq(tourSlots.id, sib.id));
    }
    // A private trip closes the departure it was booked on too — the point is
    // that nobody else joins, including on the same variant.
    if (tour.sharedTrip === false) {
      await tx
        .update(tourSlots)
        .set({ status: taken ? "full" : "open" })
        .where(eq(tourSlots.id, slot.id));
    }
  }
}
