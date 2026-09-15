import { pgTable, uuid, text, integer, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";
import { tours } from "./tours";

/**
 * A way of doing the same trip, sold at its own rate off the same calendar.
 *
 * Camp Karle is one trip with three of these — Rooms (₹3,000), Day Visit
 * (₹1,500) and Camping (₹2,500). Modelling them as three separate tours was
 * the alternative, but they share a departure calendar and a physical site, so
 * the seats have to come out of one pool: booking six people into Camping has
 * to reduce what Rooms can still sell that night.
 *
 * A tour with no variants prices and books exactly as it did before — every
 * lookup treats "no variant" as the single implicit one.
 */
export const tourVariants = pgTable(
  "tour_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tourId: uuid("tour_id")
      .references(() => tours.id, { onDelete: "cascade" })
      .notNull(),
    /** Short operator-facing code, e.g. "CK-Rooms". Unique within the tour. */
    code: text("code").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    /**
     * Seats this variant takes from the shared pool per head. Camping might
     * take 1; a room that sleeps two but blocks the whole room takes 2.
     */
    seatsPerGuest: integer("seats_per_guest").default(1).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("tour_variants_tour_idx").on(t.tourId),
    unique("tour_variants_code_unique").on(t.tourId, t.code),
  ],
);

/**
 * Extra questions asked at booking time, per trip.
 *
 * `appliesTo` decides where it shows: once on the booking ("How will you get
 * here?"), once per traveller ("T-shirt size"), or on the enquiry form.
 */
export const tourBookingFields = pgTable(
  "tour_booking_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tourId: uuid("tour_id")
      .references(() => tours.id, { onDelete: "cascade" })
      .notNull(),
    /** Stable machine key the answer is stored under. */
    key: text("key").notNull(),
    label: text("label").notNull(),
    help: text("help"),
    /** text | textarea | number | select | checkbox | date */
    fieldType: text("field_type").default("text").notNull(),
    /** Choices for fieldType "select". */
    options: text("options").array().default([]).notNull(),
    appliesTo: text("applies_to").default("booking").notNull(),
    required: boolean("required").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("tour_booking_fields_tour_idx").on(t.tourId),
    unique("tour_booking_fields_key_unique").on(t.tourId, t.key),
  ],
);

export type TourVariant = typeof tourVariants.$inferSelect;
export type TourBookingField = typeof tourBookingFields.$inferSelect;
