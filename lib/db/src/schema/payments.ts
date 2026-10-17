import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { bookings } from "./bookings";

/**
 * One row per payment attempt against a booking. A booking can have multiple
 * rows (e.g. an expired link followed by a fresh one) — `bookings.paymentStatus`
 * is the source of truth for whether the booking itself is paid; rows here are
 * the provider-side audit trail.
 */
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id)
    .notNull(),
  provider: text("provider").notNull(), // "razorpay" | "razorpay_order" | "manual"
  // "payment" adds to what the customer has paid; "refund" subtracts. Refund
  // rows carry a positive amount — the sign lives in this column so a row's
  // amount always reads as the size of the movement.
  kind: text("kind").default("payment").notNull(),
  // How the money moved. Gateway rows are "razorpay"; the rest are the manual
  // methods the team records by hand (cash on the bank, a cheque, a transfer).
  method: text("method").default("razorpay").notNull(),
  // Cheque number, UTR, receipt number — whatever identifies it off-system.
  reference: text("reference"),
  // When the money actually landed, which for manual entries is often days
  // before it gets typed in. createdAt stays the row's own creation time.
  receivedAt: timestamp("received_at", { withTimezone: true }),
  // Admin e-mail that recorded a manual entry; null for gateway rows.
  recordedBy: text("recorded_by"),
  notes: text("notes"),
  providerLinkId: text("provider_link_id"), // Razorpay payment_link id (plink_...)
  providerPaymentId: text("provider_payment_id"), // Razorpay payment id (pay_...) once paid
  shortUrl: text("short_url"), // the link URL sent to the customer
  // Whole rupees, matching bookings.totalAmount — converted to paise only at
  // the Razorpay API call boundary.
  amount: integer("amount").notNull(),
  currency: text("currency").default("INR").notNull(),
  status: text("status").default("created").notNull(), // created | paid | expired | cancelled | failed
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
