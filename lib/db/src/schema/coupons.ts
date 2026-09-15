import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  boolean,
  jsonb,
  date,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { bookings } from "./bookings";
import { customers } from "./customers";

/**
 * A discount code. Conditions mirror what the team actually sells on:
 * percentage or flat off, limited to certain tours, certain departure
 * weekdays, a booking lead time, a validity window, and usage caps.
 *
 * Bulk-generated series (a partner hand-out, a Groupon batch) share a
 * `batchId` and are otherwise ordinary coupons — usually with usageLimit 1.
 */
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Stored upper-case; matching is done on the upper-cased input.
    code: text("code").notNull(),
    label: text("label"),
    description: text("description"),

    discountType: text("discount_type").notNull(), // "percent" | "flat"
    // Percent: 0–100. Flat: whole rupees.
    discountValue: integer("discount_value").notNull(),
    // Ceiling for percentage discounts, in whole rupees. Null = uncapped.
    maxDiscount: integer("max_discount"),
    // Coupon only applies once the booking's base is at least this much.
    minBookingAmount: integer("min_booking_amount"),

    // Empty array = every tour. Otherwise the tour ids it is limited to.
    tourIds: jsonb("tour_ids").$type<string[]>().default([]).notNull(),
    // 7-bit mask of qualifying *departure* weekdays, bit 0 = Sunday, matching
    // availability_rules.weekdayMask. Null = any day.
    weekdayMask: smallint("weekday_mask"),
    // Must be booked at least this many days before departure.
    minDaysInAdvance: integer("min_days_in_advance"),

    validFrom: date("valid_from"),
    validTo: date("valid_to"),

    // Total redemptions allowed across everyone. Null = unlimited.
    usageLimit: integer("usage_limit"),
    // Redemptions allowed per customer record. Null = unlimited.
    usageLimitPerCustomer: integer("usage_limit_per_customer"),
    // Denormalised counter, incremented atomically at redemption so the limit
    // can be enforced in the same statement that claims it.
    usedCount: integer("used_count").default(0).notNull(),

    active: boolean("active").default(true).notNull(),

    // Set on codes generated together as a series.
    batchId: uuid("batch_id"),
    batchLabel: text("batch_label"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("coupons_code_unique").on(t.code)],
);

/** One row per successful redemption — the audit trail behind `usedCount`,
 *  and what the coupon report is built from. */
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  couponId: uuid("coupon_id")
    .references(() => coupons.id, { onDelete: "cascade" })
    .notNull(),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  // Snapshotted so the record survives the coupon being renamed or deleted.
  code: text("code").notNull(),
  discountAmount: integer("discount_amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;
