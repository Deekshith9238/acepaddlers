import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/** Key/value store for integration config (Google OAuth tokens, notification recipients, etc.). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
