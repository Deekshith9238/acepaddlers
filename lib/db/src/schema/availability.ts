import {
  pgTable,
  uuid,
  integer,
  smallint,
  text,
  date,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { tours } from "./tours";
import { tourVariants } from "./tour-variants";
import { slotStatusEnum } from "./enums";

/**
 * Recurring availability rules. Slots are generated from these.
 * `weekdayMask` is a 7-bit bitmask, bit 0 = Sunday … bit 6 = Saturday.
 */
export const availabilityRules = pgTable("availability_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  tourId: uuid("tour_id")
    .references(() => tours.id, { onDelete: "cascade" })
    .notNull(),
  /** Null = the rule generates one shared slot for the whole tour. */
  variantId: uuid("variant_id").references(() => tourVariants.id, { onDelete: "cascade" }),
  weekdayMask: smallint("weekday_mask").notNull(),
  startTime: text("start_time").notNull(), // "HH:MM" local time
  capacity: integer("capacity").notNull(),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Concrete bookable inventory. Source of truth for capacity locking. */
export const tourSlots = pgTable(
  "tour_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tourId: uuid("tour_id")
      .references(() => tours.id, { onDelete: "cascade" })
      .notNull(),
    /**
     * Which variant this inventory belongs to. Null is the tour-wide slot every
     * existing tour already has, so nothing about the old behaviour changes.
     */
    variantId: uuid("variant_id").references(() => tourVariants.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startTime: text("start_time").notNull(),
    capacity: integer("capacity").notNull(),
    bookedCount: integer("booked_count").default(0).notNull(),
    status: slotStatusEnum("status").default("open").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // NULLS NOT DISTINCT so the tour-wide slot (variantId null) still collides
    // with itself. Without it Postgres treats every null as unique and the same
    // date/time could be generated twice.
    unique("tour_slots_unique").on(t.tourId, t.variantId, t.date, t.startTime).nullsNotDistinct(),
  ],
);

/** Closed days. tourId null = global blackout. */
export const blackoutDates = pgTable("blackout_dates", {
  id: uuid("id").defaultRandom().primaryKey(),
  tourId: uuid("tour_id").references(() => tours.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type TourSlot = typeof tourSlots.$inferSelect;
export type BlackoutDate = typeof blackoutDates.$inferSelect;
