import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { adminRoleEnum } from "./enums";

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: adminRoleEnum("role").default("admin").notNull(),
  active: boolean("active").default(true).notNull(),
  /** Set when an admin creates the account, so the UI can prompt a reset. */
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  /**
   * Firebase account this admin signs in with, recorded on first successful
   * sign-in. The email stays the thing we match on — this is for audit and for
   * noticing when one Firebase identity turns up under a second address.
   */
  firebaseUid: text("firebase_uid"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => adminUsers.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
