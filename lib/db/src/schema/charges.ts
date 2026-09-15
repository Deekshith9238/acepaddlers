import { pgTable, uuid, text, integer, boolean, jsonb, date, timestamp } from "drizzle-orm/pg-core";

/**
 * Taxes and fees added on top of a booking's base price.
 *
 * Promoted out of the settings key/value blob into a real table so a charge
 * can be scoped to particular tours and given a validity window — the two
 * things the previous platform had and we didn't.
 *
 * The validity window is the dangerous part: on the old system every tax rule
 * expired and nobody noticed, so bookings ran untaxed for two years. Expiry
 * here is surfaced loudly in the admin rather than failing quietly.
 */
export const charges = pgTable("charges", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  /** "percent" of the base, or "flat" rupees. */
  type: text("type").default("percent").notNull(),
  value: integer("value").notNull(),
  /** Empty = every tour. Otherwise the tour ids this charge applies to. */
  tourIds: jsonb("tour_ids").$type<string[]>().default([]).notNull(),
  /**
   * Empty = every payment method. Otherwise the methods this charge applies to
   * — a card surcharge that shouldn't hit a UPI payer, say.
   *
   * Because the gateway's own fee depends on how the customer pays, and the
   * customer picks that inside Razorpay's sheet *after* the total is fixed,
   * a method-scoped charge forces the method to be chosen on our booking form
   * instead, and that choice is then pinned at checkout.
   */
  paymentMethods: jsonb("payment_methods").$type<string[]>().default([]).notNull(),
  /** Null on either side = open-ended. */
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Charge = typeof charges.$inferSelect;
