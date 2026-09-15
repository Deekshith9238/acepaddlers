import { pgTable, uuid, text, jsonb, timestamp, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * One record per human, deduplicated across every booking and enquiry they
 * ever make. Phone is the identity key rather than e-mail: every booking
 * carries a phone number, but WhatsApp-originated bookings have no e-mail at
 * all (the bot never asks for one), so e-mail cannot be relied on.
 *
 * `phoneNormalized` is the digits-only form used for matching — see
 * `normalizePhone()` in api-server/src/lib/customers.ts. The display `phone`
 * keeps whatever the customer actually typed.
 */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerRef: text("customer_ref").notNull().unique(),
    salutation: text("salutation"),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    phoneNormalized: text("phone_normalized"),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    notes: text("notes"),
    // Duplicate identities are merged rather than deleted: the loser keeps its
    // row (so old links still resolve) and points at the survivor. Anything
    // reading a customer should follow this pointer when it is set.
    mergedIntoId: uuid("merged_into_id").references((): AnyPgColumn => customers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("customers_phone_normalized_unique").on(t.phoneNormalized)],
);

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
