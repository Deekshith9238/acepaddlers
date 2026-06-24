import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { tours } from "./tours";
import { tourSlots } from "./availability";
import { bookingStatusEnum, paymentStatusEnum } from "./enums";

export type GuestDetail = {
  name?: string;
  age?: number;
  weightKg?: number;
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
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  numGuests: integer("num_guests").notNull(),
  guestDetails: jsonb("guest_details").$type<GuestDetail[]>().default([]).notNull(),
  totalAmount: integer("total_amount").notNull(),
  currency: text("currency").default("INR").notNull(),
  status: bookingStatusEnum("status").default("pending").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
  googleEventId: text("google_event_id"),
  notes: text("notes"),
  source: text("source").default("website").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;
