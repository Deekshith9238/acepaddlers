import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { tours } from "./tours";
import { tourSlots } from "./availability";
import { tourVariants } from "./tour-variants";
import { agents } from "./agents";
import { bookingStatusEnum, paymentStatusEnum } from "./enums";
import { customers } from "./customers";

export type GuestDetail = {
  name?: string;
  age?: number;
  weightKg?: number;
};

/** One participant-type line on a booking, priced at booking time. */
export type ParticipantLine = {
  typeId: string | null;
  label: string;
  count: number;
  unitPrice: number;
  amount: number;
  /** Set when a volume tier replaced the type's list price. */
  tierApplied?: boolean;
};

/** One add-on line on a booking, priced at booking time. */
export type AddonLine = {
  addonId: string;
  label: string;
  qty: number;
  unitPrice: number;
  priceType: string;
  amount: number;
};

/** One admin-configured tax/fee line, resolved to a rupee amount at booking time. */
export type ChargeLine = {
  label: string;
  type: "percent" | "flat";
  value: number;
  amount: number;
};

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingRef: text("booking_ref").notNull().unique(),
  tourId: uuid("tour_id")
    .references(() => tours.id)
    .notNull(),
  slotId: uuid("slot_id")
    .references(() => tourSlots.id)
    .notNull(),
  // Which way of doing the trip was sold (Rooms / Day visit / Camping). Null
  // for tours that have no variants, which is every tour that predates them.
  variantId: uuid("variant_id").references(() => tourVariants.id, { onDelete: "set null" }),
  // The agent this booking is credited to, if it came through one. Set null on
  // delete rather than cascading — losing an agent must never lose a booking.
  agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
  // Answers to the trip's own extra booking questions, keyed by field key.
  extraFields: jsonb("extra_fields").$type<Record<string, string>>().default({}).notNull(),
  // Deduplicated identity behind this booking. Nullable so a booking is never
  // blocked by customer-matching failing; backfilled by the same helper that
  // creates it.
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  numGuests: integer("num_guests").notNull(),
  // Capacity actually taken from the slot, which is not the head count: an
  // infant in arms takes none, and a variant can take more than one per guest.
  // Stored so cancelling returns exactly what the booking consumed. Null on
  // rows written before this existed; those fall back to numGuests.
  seatsUsed: integer("seats_used"),
  guestDetails: jsonb("guest_details").$type<GuestDetail[]>().default([]).notNull(),
  // Base price × guests − discountAmount + this breakdown's amounts = totalAmount.
  // Snapshotted at booking time so later admin edits to charges don't
  // retroactively change past bookings.
  chargesBreakdown: jsonb("charges_breakdown").$type<ChargeLine[]>().default([]).notNull(),
  // Who was booked and what each paid. Snapshotted for the same reason as the
  // charges: later edits to a tour's rate card must not rewrite past bookings.
  participantBreakdown: jsonb("participant_breakdown").$type<ParticipantLine[]>().default([]).notNull(),
  addonsBreakdown: jsonb("addons_breakdown").$type<AddonLine[]>().default([]).notNull(),
  // Coupon applied at booking time. The code is snapshotted alongside the id so
  // the booking still reads correctly if the coupon is later deleted.
  couponId: uuid("coupon_id"),
  couponCode: text("coupon_code"),
  discountAmount: integer("discount_amount").default(0).notNull(),
  totalAmount: integer("total_amount").notNull(),
  currency: text("currency").default("INR").notNull(),
  status: bookingStatusEnum("status").default("pending").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
  // How the customer said they would pay, captured at booking time. Needed
  // because a method-scoped charge is only defensible if we recorded which
  // method it was charged for.
  paymentMethod: text("payment_method"),
  googleEventId: text("google_event_id"),
  // The customer's own message, captured at booking time.
  notes: text("notes"),
  // Staff-only. Kept separate from `notes` so an admin can write freely
  // without any chance of it reaching the customer.
  internalNotes: text("internal_notes"),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  source: text("source").default("website").notNull(),
  // Set once the trip-reminder job has messaged this booking, so it never
  // sends twice for the same trip.
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;
