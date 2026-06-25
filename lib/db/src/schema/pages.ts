import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { contentStatusEnum } from "./enums";

/**
 * Editable marketing pages composed in the visual builder (Puck).
 * `data` holds the Puck document (sections + props); the public site renders it.
 */
export const pages = pgTable("pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(), // e.g. "home"
  title: text("title").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
  status: contentStatusEnum("status").default("draft").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Page = typeof pages.$inferSelect;
export type InsertPage = typeof pages.$inferInsert;
