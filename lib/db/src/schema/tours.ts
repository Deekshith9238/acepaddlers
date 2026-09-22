import { pgTable, uuid, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { contentStatusEnum } from "./enums";
import { destinations } from "./destinations";
import { tourTypes, tourCategories } from "./tour-lookups";

export const tours = pgTable("tours", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  destinationId: uuid("destination_id").references(() => destinations.id, {
    onDelete: "set null",
  }),
  // References tourTypes.slug / tourCategories.slug (admin-managed lookups)
  // rather than a fixed Postgres enum, so new activity types/categories can
  // be added without a schema change.
  type: text("type").notNull().references(() => tourTypes.slug),
  category: text("category").default("activity").notNull().references(() => tourCategories.slug),
  title: text("title").notNull(),
  location: text("location"),
  tagline: text("tagline"),
  description: text("description"),
  heroImage: text("hero_image"),
  images: jsonb("images").$type<string[]>().default([]).notNull(),
  // Price stored as whole rupees (INR). Use integer to avoid float issues.
  priceValue: integer("price_value").notNull(),
  currency: text("currency").default("INR").notNull(),
  duration: text("duration"),
  maxGroupSize: integer("max_group_size"),
  capacityPerSlot: integer("capacity_per_slot").default(8).notNull(),
  // "direct"  — customer pays online immediately; booking auto-confirms on payment.
  // "enquiry" — no payment taken; captured as a request for the team to confirm.
  bookingMode: text("booking_mode").default("direct").notNull(),
  minAge: integer("min_age"),
  maxWeightKg: integer("max_weight_kg"),
  season: text("season"),
  difficulty: text("difficulty"),
  highlights: jsonb("highlights").$type<string[]>().default([]).notNull(),
  included: jsonb("included").$type<string[]>().default([]).notNull(),
  excluded: jsonb("excluded").$type<string[]>().default([]).notNull(),
  // Rich tour-detail extras the frontend renders: metaTitle, stretchLength,
  // raw group-size/min-age/max-weight text, rapidGrades, activities, faqs.
  details: jsonb("details").$type<Record<string, unknown>>().default({}).notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),

  // ── Basic details ──
  /** Operator-facing short code, e.g. "ACE-CampKarle". Shown on manifests. */
  code: text("code"),
  /** false = a private departure, not pooled with other customers. */
  sharedTrip: boolean("shared_trip").default(true).notNull(),
  minParticipants: integer("min_participants"),
  maxParticipants: integer("max_participants"),
  /** Terms shown for this trip only; the site-wide terms apply otherwise. */
  terms: text("terms"),

  // ── Prices & rates display ──
  /** Headline "from" price, for display only — the rate card does the maths. */
  advertisedPrice: integer("advertised_price"),
  /** Where the price label sits relative to the number: before | after | none. */
  priceLabelPosition: text("price_label_position").default("before").notNull(),
  /** The label's own words, VL-style — "Starting from", "Per Person". Null = the site-wide defaults. */
  priceLabel: text("price_label"),
  /** List the group rates (volume tiers) on the trip page. */
  showGroupRates: boolean("show_group_rates").default(false).notNull(),
  showAdvertisedPrice: boolean("show_advertised_price").default(true).notNull(),

  // ── Storefront behaviour ──
  allowPartialDeposit: boolean("allow_partial_deposit").default(false).notNull(),
  /** Percent of the total accepted as a deposit when partials are allowed. */
  depositPercent: integer("deposit_percent").default(100).notNull(),
  /**
   * independent — seats are this trip's alone
   * reduces     — booking here reduces the shared pool for sibling trips
   * closes      — booking here closes siblings for that slot outright
   */
  seatSharing: text("seat_sharing").default("independent").notNull(),
  /** calendar | list — how departures are offered on the tour page. */
  departureDisplay: text("departure_display").default("calendar").notNull(),
  showSeatsAvailable: boolean("show_seats_available").default(true).notNull(),
  showSeatsBooked: boolean("show_seats_booked").default(false).notNull(),
  showGuaranteedDeparture: boolean("show_guaranteed_departure").default(false).notNull(),
  showSeatsToGuarantee: boolean("show_seats_to_guarantee").default(false).notNull(),
  /** Hours before departure after which the slot stops selling. */
  bookingLeadTimeHours: integer("booking_lead_time_hours").default(0).notNull(),
  /** Days before departure after which only full payment is accepted. */
  paymentDeadlineDays: integer("payment_deadline_days"),

  // ── Itinerary ──
  /** Day-wise builder: [{ title, items: [{ time, text }] }]. */
  itinerary: jsonb("itinerary").$type<unknown[]>().default([]).notNull(),
  /** Free-text itinerary, used when the day-wise builder is empty. */
  itineraryText: text("itinerary_text"),

  // ── Location ──
  latitude: text("latitude"),
  longitude: text("longitude"),
  /** Short, recognisable place shown on tour cards, e.g. "Barapole, Coorg". */
  shortAddress: text("short_address"),
  detailedAddress: text("detailed_address"),
  directions: text("directions"),

  // ── Notifications ──
  /** Replaces the standard opening paragraph of the confirmation email. */
  confirmationEmailIntro: text("confirmation_email_intro"),

  // ── Advanced ──
  /** Custom nouns: { trip, departure, participant, room }. */
  labels: jsonb("labels").$type<Record<string, string>>().default({}).notNull(),
  /** Tour ids to show as "related"; empty = pick automatically. */
  relatedTourIds: jsonb("related_tour_ids").$type<string[]>().default([]).notNull(),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),

  status: contentStatusEnum("status").default("draft").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Tour = typeof tours.$inferSelect;
export type InsertTour = typeof tours.$inferInsert;
