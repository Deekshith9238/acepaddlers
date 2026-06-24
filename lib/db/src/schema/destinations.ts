import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { contentStatusEnum } from "./enums";

export const destinations = pgTable("destinations", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  fullName: text("full_name"),
  tagline: text("tagline"),
  description: text("description"),
  heroImage: text("hero_image"),
  images: jsonb("images").$type<string[]>().default([]).notNull(),
  highlights: jsonb("highlights").$type<string[]>().default([]).notNull(),
  bestTime: text("best_time"),
  distance: text("distance"),
  mapEmbed: text("map_embed"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  status: contentStatusEnum("status").default("draft").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Destination = typeof destinations.$inferSelect;
export type InsertDestination = typeof destinations.$inferInsert;
