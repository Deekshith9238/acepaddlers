import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const galleryItems = pgTable("gallery_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  src: text("src").notNull(),
  alt: text("alt"),
  caption: text("caption"),
  category: text("category").notNull(), // Rafting | Camping | Homestay | Destinations
  tall: boolean("tall").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  published: boolean("published").default(true).notNull(),
  // Canvas layout (grid units): position + size. Null until arranged in the
  // admin layout editor; the public gallery falls back to masonry when unset.
  layoutX: integer("layout_x"),
  layoutY: integer("layout_y"),
  layoutW: integer("layout_w"),
  layoutH: integer("layout_h"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type GalleryItem = typeof galleryItems.$inferSelect;
export type InsertGalleryItem = typeof galleryItems.$inferInsert;
