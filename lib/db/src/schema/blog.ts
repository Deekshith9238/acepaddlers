import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { contentStatusEnum } from "./enums";

export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  coverImage: text("cover_image"),
  body: text("body"), // markdown
  author: text("author"),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  readTime: text("read_time"),
  status: contentStatusEnum("status").default("draft").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;
