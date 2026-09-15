import { pgTable, uuid, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { tours } from "./tours";
import { tourVariants } from "./tour-variants";

/**
 * Who is being charged, and what they pay. A tour with no rows here falls back
 * to `tours.priceValue` for everyone — every existing tour keeps working
 * untouched, and the WhatsApp bot's "N people" flow still prices correctly.
 */
export const tourParticipantTypes = pgTable(
  "tour_participant_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tourId: uuid("tour_id")
      .references(() => tours.id, { onDelete: "cascade" })
      .notNull(),
    /**
     * Null means the row applies to every variant of the tour — which is also
     * what a tour with no variants at all gets. Set it to scope a rate to one
     * variant: Camp Karle charges a different adult rate for Rooms than for
     * Camping.
     */
    variantId: uuid("variant_id").references(() => tourVariants.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // "Adult", "Child (5–12)", "Foreign national"
    description: text("description"),
    price: integer("price").notNull(), // whole rupees, per head
    minAge: integer("min_age"),
    maxAge: integer("max_age"),
    // Counts toward the slot's capacity. An infant-in-arms type can be sold
    // without consuming a seat.
    occupiesSeat: boolean("occupies_seat").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("tour_participant_types_tour_idx").on(t.tourId)],
);

/**
 * Volume pricing: below 50 people it's ₹2,600 a head, above it's ₹2,350.
 *
 * Bands are matched on the booking's *total* head count, not the count within
 * one participant type — a group of 60 gets the group rate even when it is
 * split across adults and children. A tier with a null participantTypeId
 * applies to every type on the tour.
 */
export const tourPriceTiers = pgTable(
  "tour_price_tiers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tourId: uuid("tour_id")
      .references(() => tours.id, { onDelete: "cascade" })
      .notNull(),
    participantTypeId: uuid("participant_type_id").references(() => tourParticipantTypes.id, {
      onDelete: "cascade",
    }),
    minGuests: integer("min_guests").notNull(),
    // Null = no upper bound.
    maxGuests: integer("max_guests"),
    price: integer("price").notNull(), // per head, whole rupees
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("tour_price_tiers_tour_idx").on(t.tourId)],
);

/** Priced extras sold alongside the trip — equipment hire, a guided trek, a
 *  meal — with quantity bounds. */
export const tourAddons = pgTable(
  "tour_addons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tourId: uuid("tour_id")
      .references(() => tours.id, { onDelete: "cascade" })
      .notNull(),
    /** Null = offered on every variant. */
    variantId: uuid("variant_id").references(() => tourVariants.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description"),
    price: integer("price").notNull(),
    // "per_person" multiplies by the head count; "per_unit" charges by the
    // quantity the customer picks; "per_booking" is a flat add.
    priceType: text("price_type").default("per_unit").notNull(),
    minQty: integer("min_qty").default(0).notNull(),
    maxQty: integer("max_qty"),
    // Forced onto every booking of this tour (a mandatory permit fee).
    required: boolean("required").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("tour_addons_tour_idx").on(t.tourId)],
);

export type TourParticipantType = typeof tourParticipantTypes.$inferSelect;
export type TourPriceTier = typeof tourPriceTiers.$inferSelect;
export type TourAddon = typeof tourAddons.$inferSelect;
