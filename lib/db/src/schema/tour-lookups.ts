import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Admin-managed activity types (Rafting, Camping, ...) and categories
 * (activity/accommodation/package). `slug` is what `tours.type`/`tours.category`
 * reference; `label` is the display text shown across the site and admin.
 */
export const tourTypes = pgTable("tour_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tourCategories = pgTable("tour_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type TourTypeRow = typeof tourTypes.$inferSelect;
export type InsertTourType = typeof tourTypes.$inferInsert;
export type TourCategoryRow = typeof tourCategories.$inferSelect;
export type InsertTourCategory = typeof tourCategories.$inferInsert;
