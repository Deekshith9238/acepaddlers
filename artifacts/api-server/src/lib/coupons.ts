import { randomInt } from "node:crypto";
import { and, eq, sql, isNull, or, gt } from "drizzle-orm";
import { db, coupons, couponRedemptions } from "@workspace/db";
import type { Coupon } from "@workspace/db";

/**
 * Either the pooled client or an open transaction. Claiming a coupon and
 * writing its redemption must happen on the *same* connection as the booking
 * insert: on a separate one the redemption's foreign key points at a row that
 * hasn't committed yet, and a rolled-back booking would still have burned a
 * use off a limited code.
 */
export type Executor = Pick<typeof db, "update" | "insert" | "select">;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

export function generateCouponCode(prefix = "", length = 8): string {
  let s = "";
  for (let i = 0; i < length; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${prefix.toUpperCase()}${s}`;
}

export function normalizeCode(raw: string): string {
  return String(raw ?? "").trim().toUpperCase();
}

/** Why a coupon didn't apply. These strings reach the customer via the UI's
 *  message map, so each one has to name a fixable condition. */
export type CouponRejection =
  | "not_found"
  | "inactive"
  | "not_yet_valid"
  | "expired"
  | "usage_limit_reached"
  | "customer_limit_reached"
  | "tour_not_eligible"
  | "weekday_not_eligible"
  | "too_late"
  | "below_minimum";

export interface CouponContext {
  /** Base price × guests, before any charges. Discounts apply to this. */
  baseAmount: number;
  tourId: string;
  /** Departure date, YYYY-MM-DD. */
  departureDate: string | null;
  /** Resolved customer, when known — needed for per-customer limits. */
  customerId?: string | null;
  /** Defaults to today; injectable so the rules can be tested deterministically. */
  now?: Date;
}

export interface CouponEvaluation {
  ok: boolean;
  reason?: CouponRejection;
  coupon?: Coupon;
  discount: number;
  /** Base after the discount — what taxes and fees are then computed on. */
  discountedBase: number;
}

function istDateString(d: Date): string {
  return new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
}

/** Whole days between two YYYY-MM-DD dates, b − a. */
function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function computeDiscount(coupon: Coupon, baseAmount: number): number {
  const raw =
    coupon.discountType === "flat"
      ? coupon.discountValue
      : Math.round((baseAmount * coupon.discountValue) / 100);
  const capped = coupon.maxDiscount != null ? Math.min(raw, coupon.maxDiscount) : raw;
  // Never discount below zero, and never more than the booking is worth.
  return Math.max(0, Math.min(capped, baseAmount));
}

/**
 * Checks every condition on a coupon against one prospective booking.
 *
 * Read-only: it never claims a redemption. `redeemCoupon` re-checks the usage
 * cap atomically at booking time, because between a customer seeing "valid"
 * and pressing pay, someone else may have taken the last one.
 */
export async function evaluateCoupon(code: string, ctx: CouponContext): Promise<CouponEvaluation> {
  const fail = (reason: CouponRejection, coupon?: Coupon): CouponEvaluation => ({
    ok: false,
    reason,
    coupon,
    discount: 0,
    discountedBase: ctx.baseAmount,
  });

  const normalized = normalizeCode(code);
  if (!normalized) return fail("not_found");

  const [coupon] = await db.select().from(coupons).where(eq(coupons.code, normalized)).limit(1);
  if (!coupon) return fail("not_found");
  if (!coupon.active) return fail("inactive", coupon);

  const today = istDateString(ctx.now ?? new Date());
  if (coupon.validFrom && today < coupon.validFrom) return fail("not_yet_valid", coupon);
  if (coupon.validTo && today > coupon.validTo) return fail("expired", coupon);

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return fail("usage_limit_reached", coupon);
  }

  if (coupon.usageLimitPerCustomer != null && ctx.customerId) {
    const [used] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.customerId, ctx.customerId)));
    if ((used?.n ?? 0) >= coupon.usageLimitPerCustomer) return fail("customer_limit_reached", coupon);
  }

  const tourIds = coupon.tourIds ?? [];
  if (tourIds.length > 0 && !tourIds.includes(ctx.tourId)) return fail("tour_not_eligible", coupon);

  if (ctx.departureDate) {
    if (coupon.weekdayMask != null) {
      // getUTCDay on a date-only string is the calendar weekday, no timezone
      // drift — 0 = Sunday, matching the mask's bit order.
      const weekday = new Date(`${ctx.departureDate}T00:00:00Z`).getUTCDay();
      if ((coupon.weekdayMask & (1 << weekday)) === 0) return fail("weekday_not_eligible", coupon);
    }
    if (coupon.minDaysInAdvance != null) {
      if (daysBetween(today, ctx.departureDate) < coupon.minDaysInAdvance) return fail("too_late", coupon);
    }
  }

  if (coupon.minBookingAmount != null && ctx.baseAmount < coupon.minBookingAmount) {
    return fail("below_minimum", coupon);
  }

  const discount = computeDiscount(coupon, ctx.baseAmount);
  return { ok: true, coupon, discount, discountedBase: ctx.baseAmount - discount };
}

/**
 * Claims one redemption, enforcing the total usage cap in the same statement
 * that increments it — two customers racing for the last code can't both win.
 *
 * Returns false if the cap was already reached, in which case the caller must
 * fall back to the undiscounted price rather than honouring a stale quote.
 */
export async function claimCouponUse(couponId: string, tx: Executor = db): Promise<boolean> {
  const updated = await tx
    .update(coupons)
    .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
    .where(
      and(
        eq(coupons.id, couponId),
        eq(coupons.active, true),
        // Null usageLimit means unlimited; otherwise there must be room left.
        or(isNull(coupons.usageLimit), gt(coupons.usageLimit, coupons.usedCount)),
      ),
    )
    .returning({ id: coupons.id });
  return updated.length > 0;
}

export async function recordRedemption(
  input: {
    couponId: string;
    code: string;
    bookingId: string;
    customerId?: string | null;
    discountAmount: number;
  },
  tx: Executor = db,
): Promise<void> {
  await tx.insert(couponRedemptions).values({
    couponId: input.couponId,
    code: input.code,
    bookingId: input.bookingId,
    customerId: input.customerId ?? null,
    discountAmount: input.discountAmount,
  });
}

/** Releases a claimed use — called when a booking that held a redemption is
 *  deleted, so a cancelled sale doesn't permanently consume a limited code. */
export async function releaseCouponUse(couponId: string): Promise<void> {
  await db
    .update(coupons)
    .set({ usedCount: sql`greatest(0, ${coupons.usedCount} - 1)`, updatedAt: new Date() })
    .where(eq(coupons.id, couponId));
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Human summary of a coupon's conditions, for admin lists and the audit trail. */
export function describeCoupon(c: Coupon): string {
  const parts: string[] = [];
  parts.push(c.discountType === "flat" ? `₹${c.discountValue} off` : `${c.discountValue}% off`);
  if (c.maxDiscount != null && c.discountType === "percent") parts.push(`max ₹${c.maxDiscount}`);
  if ((c.tourIds ?? []).length > 0) parts.push(`${c.tourIds.length} tour(s)`);
  else parts.push("all tours");
  if (c.weekdayMask != null) {
    const days = WEEKDAY_LABELS.filter((_, i) => (c.weekdayMask! & (1 << i)) !== 0);
    parts.push(days.length === 7 ? "any day" : days.join("/"));
  }
  if (c.minDaysInAdvance != null) parts.push(`${c.minDaysInAdvance}+ days ahead`);
  if (c.minBookingAmount != null) parts.push(`min ₹${c.minBookingAmount}`);
  if (c.usageLimit != null) parts.push(`${c.usedCount}/${c.usageLimit} used`);
  return parts.join(" · ");
}
