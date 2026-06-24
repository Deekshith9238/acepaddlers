import { pgEnum } from "drizzle-orm/pg-core";

export const tourTypeEnum = pgEnum("tour_type", [
  "rafting",
  "camping",
  "homestay",
  "water_sports",
]);

export const contentStatusEnum = pgEnum("content_status", ["draft", "published"]);

export const slotStatusEnum = pgEnum("slot_status", ["open", "closed", "full"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "deposit",
  "paid",
  "refunded",
]);

export const adminRoleEnum = pgEnum("admin_role", ["admin", "editor"]);

export const mediaKindEnum = pgEnum("media_kind", ["image", "video"]);

export const mediaStatusEnum = pgEnum("media_status", [
  "uploading",
  "processing",
  "ready",
  "failed",
]);
