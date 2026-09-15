import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * WhatsApp bot conversation state, one row per customer phone number.
 * `state` is the step the conversation is at (menu / await_guests / await_slot…);
 * `data` carries step context (selected tourId, numGuests). Rows are upserted on
 * every inbound message and treated as expired after a few hours of silence.
 */
export const waSessions = pgTable("wa_sessions", {
  phone: text("phone").primaryKey(),
  state: text("state").default("menu").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type WaSession = typeof waSessions.$inferSelect;
