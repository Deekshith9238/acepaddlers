import { pgTable, uuid, text, integer, jsonb, date, timestamp } from "drizzle-orm/pg-core";
import { enquiryStatusEnum } from "./enums";
import { tours } from "./tours";
import { destinations } from "./destinations";
import { customers } from "./customers";
import { adminUsers } from "./admin";

/**
 * A lead that has not become a booking. Distinct from a `pending` booking:
 * an enquiry has no slot and no held capacity, and may name nothing more
 * specific than "sometime in October, roughly 20 people".
 *
 * Every public lead-capture form on the site lands here.
 */
export const enquiries = pgTable("enquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  enquiryRef: text("enquiry_ref").notNull().unique(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),

  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  company: text("company"),

  // What they asked about. All optional — a general enquiry names neither.
  tourId: uuid("tour_id").references(() => tours.id, { onDelete: "set null" }),
  destinationId: uuid("destination_id").references(() => destinations.id, { onDelete: "set null" }),
  preferredDate: date("preferred_date"),
  numGuests: integer("num_guests"),
  message: text("message"),
  // Free-form extras a particular form collects that don't deserve columns
  // (budget band, "how did you hear about us", corporate outing type…).
  extra: jsonb("extra").$type<Record<string, unknown>>().default({}).notNull(),

  // Which form/channel produced it: website | corporate | whatsapp | phone | manual
  source: text("source").default("website").notNull(),
  status: enquiryStatusEnum("status").default("new").notNull(),
  assigneeId: uuid("assignee_id").references(() => adminUsers.id, { onDelete: "set null" }),
  internalNotes: text("internal_notes"),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  // Set when the lead converts, so won/lost reporting can be tied to revenue.
  convertedBookingId: uuid("converted_booking_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Enquiry = typeof enquiries.$inferSelect;
export type InsertEnquiry = typeof enquiries.$inferInsert;
