import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { tourTypeEnum, contentStatusEnum } from "./enums";
import { destinations } from "./destinations";

export const tours = pgTable("tours", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  destinationId: uuid("destination_id").references(() => destinations.id, {
    onDelete: "set null",
  }),
  type: tourTypeEnum("type").notNull(),
  title: text("title").notNull(),
  location: text("location"),
  tagline: text("tagline"),
  description: text("description"),
  heroImage: text("hero_image"),
  images: jsonb("images").$type<string[]>().default([]).notNull(),
  // Price stored as whole rupees (INR). Use integer to avoid float issues.
  priceValue: integer("price_value").notNull(),
  currency: text("currency").default("INR").notNull(),
  duration: text("duration"),
  maxGroupSize: integer("max_group_size"),
  capacityPerSlot: integer("capacity_per_slot").default(8).notNull(),
  minAge: integer("min_age"),
  maxWeightKg: integer("max_weight_kg"),
  season: text("season"),
  difficulty: text("difficulty"),
  highlights: jsonb("highlights").$type<string[]>().default([]).notNull(),
  included: jsonb("included").$type<string[]>().default([]).notNull(),
  excluded: jsonb("excluded").$type<string[]>().default([]).notNull(),
  // Rich tour-detail extras the frontend renders: metaTitle, stretchLength,
  // raw group-size/min-age/max-weight text, rapidGrades, activities, faqs.
  details: jsonb("details").$type<Record<string, unknown>>().default({}).notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  status: contentStatusEnum("status").default("draft").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Tour = typeof tours.$inferSelect;
export type InsertTour = typeof tours.$inferInsert;
