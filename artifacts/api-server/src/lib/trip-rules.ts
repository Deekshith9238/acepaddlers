import type { tours, tourSlots } from "@workspace/db";

type TourRow = typeof tours.$inferSelect;
type SlotRow = typeof tourSlots.$inferSelect;

/**
 * The trip-editor settings that decide whether a departure can be booked.
 *
 * These live in one module because two callers must agree: `/availability`
 * decides what the site offers, and `createBooking` decides what it accepts.
 * If those drifted apart you would get either departures the customer can see
 * but not buy, or — worse — a rule the UI enforces and the API does not, which
 * is no rule at all.
 *
 * IST is UTC+5:30 with no daylight saving, so a fixed offset is exact. Every
 * departure in this business runs on IST; there is no second timezone.
 */
const IST_OFFSET_MS = 5.5 * 3600e3;

/** Epoch ms for a slot's "YYYY-MM-DD" + "HH:MM", read as IST wall-clock. */
export function slotStartMs(slot: Pick<SlotRow, "date" | "startTime">): number {
  const [h, m] = (slot.startTime ?? "00:00").split(":").map(Number);
  const midnightUtc = Date.parse(`${slot.date}T00:00:00Z`);
  if (Number.isNaN(midnightUtc)) return NaN;
  return midnightUtc + (h || 0) * 3600e3 + (m || 0) * 60e3 - IST_OFFSET_MS;
}

/**
 * Is this departure still far enough away to book?
 *
 * `bookingLeadTimeHours` is the notice the team needs — guides rostered, gear
 * loaded, water level checked. 0 means "up to the minute", which is why the
 * check is `>=` on the cutoff rather than truthiness on the setting.
 */
export function withinLeadTime(
  tour: Pick<TourRow, "bookingLeadTimeHours">,
  slot: Pick<SlotRow, "date" | "startTime">,
  now = Date.now(),
): boolean {
  const hours = tour.bookingLeadTimeHours ?? 0;
  const start = slotStartMs(slot);
  // A slot we cannot parse is left bookable: refusing every departure because
  // of one malformed row would be a far worse failure than allowing it.
  if (Number.isNaN(start)) return true;
  return start - now >= hours * 3600e3;
}

export type PartySizeIssue = "below_min_participants" | "above_max_participants";

/**
 * Party-size limits for one booking.
 *
 * Counted in guests, not seats: "minimum 4 people" is about who turns up, and
 * an infant who occupies no seat is still a person the guide is responsible
 * for. Seat capacity is enforced separately and always.
 */
export function checkPartySize(
  tour: Pick<TourRow, "minParticipants" | "maxParticipants">,
  numGuests: number,
): PartySizeIssue | null {
  if (tour.minParticipants != null && numGuests < tour.minParticipants) return "below_min_participants";
  if (tour.maxParticipants != null && numGuests > tour.maxParticipants) return "above_max_participants";
  return null;
}

/**
 * The amount to collect now, in the smallest currency unit.
 *
 * A deposit is only offered when the trip allows it *and* names a percentage
 * below 100 — a "deposit" of the whole total is just the total, and charging
 * it while calling it a deposit would mislead. Always rounded up, so the
 * balance is never a fraction of a rupee.
 */
export function amountDueNow(
  tour: Pick<TourRow, "allowPartialDeposit" | "depositPercent">,
  totalAmount: number,
): number {
  const pct = tour.depositPercent ?? 0;
  if (!tour.allowPartialDeposit || pct <= 0 || pct >= 100) return totalAmount;
  return Math.min(totalAmount, Math.ceil((totalAmount * pct) / 100));
}

/**
 * When an unpaid booking stops being holdable, or null for no deadline.
 *
 * Measured from now rather than from the departure: it is a payment window,
 * and a trip booked six months out should not get a six-month one.
 */
export function paymentDueAt(
  tour: Pick<TourRow, "paymentDeadlineDays">,
  from = new Date(),
): Date | null {
  const days = tour.paymentDeadlineDays;
  if (days == null || days <= 0) return null;
  return new Date(from.getTime() + days * 86400e3);
}
