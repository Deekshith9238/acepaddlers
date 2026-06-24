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
    date: date("date").notNull(),
    startTime: text("start_time").notNull(),
    capacity: integer("capacity").notNull(),
    bookedCount: integer("booked_count").default(0).notNull(),
    status: slotStatusEnum("status").default("open").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("tour_slots_unique").on(t.tourId, t.date, t.startTime)],
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
