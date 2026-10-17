import { pgEnum } from "drizzle-orm/pg-core";

export const contentStatusEnum = pgEnum("content_status", ["draft", "published"]);

export const slotStatusEnum = pgEnum("slot_status", ["open", "closed", "full"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  // Direct-mode checkout that was started and never paid. Distinct from
  // "pending", which for an enquiry-mode tour is a perfectly healthy state
  // awaiting the team, and from "cancelled", which someone chose.
  "cart_abandoned",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "deposit",
  "paid",
  "refunded",
]);

/**
 * Who can do what. Ordered from most to least privileged; `owner` exists so
 * there is always someone who can manage users, and the last one can never be
 * removed or demoted.
 */
export const adminRoleEnum = pgEnum("admin_role", [
  "owner",
  "admin",
  "manager", // bookings, enquiries, customers, availability
  "finance", // payments, coupons, reports
  "editor", // content only
  "viewer", // read-only
]);

export const mediaKindEnum = pgEnum("media_kind", ["image", "video"]);

export const mediaStatusEnum = pgEnum("media_status", [
  "uploading",
  "processing",
  "ready",
  "failed",
]);

export const enquiryStatusEnum = pgEnum("enquiry_status", [
  "new",
  "active",
  "won",
  "lost",
  "archived",
  "spam",
]);
