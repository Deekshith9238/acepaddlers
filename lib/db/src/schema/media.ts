import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { mediaKindEnum, mediaStatusEnum } from "./enums";

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: mediaKindEnum("kind").notNull(),
  status: mediaStatusEnum("status").default("ready").notNull(),
  url: text("url"), // public URL (CloudFront / local /media)
  hlsUrl: text("hls_url"), // HLS manifest for video
  posterUrl: text("poster_url"),
  storageKey: text("storage_key"),
  filename: text("filename"),
  mime: text("mime"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = typeof mediaAssets.$inferInsert;
