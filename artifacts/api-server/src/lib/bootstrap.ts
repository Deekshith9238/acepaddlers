import { asc, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, adminUsers } from "@workspace/db";
import { hashPassword } from "./auth";
import { logger } from "./logger";

/**
 * Create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD env vars if that
 * email doesn't already exist. No-op when the vars are unset.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  try {
    await migrate(db, { migrationsFolder: "lib/db/drizzle" });
    logger.info("Database migrations complete");
  } catch (err) {
    logger.error({ err }, "Database migrations failed");
    throw err;
  }

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  if (existing) {
    await ensureAnOwnerExists();
    return;
  }

  const passwordHash = await hashPassword(password);
  await db.insert(adminUsers).values({
    email,
    passwordHash,
    name: process.env.ADMIN_NAME ?? "Admin",
    role: "owner",
  });
  logger.info({ email }, "Bootstrapped first admin user");
}

/**
 * Roles gained an `owner` tier above `admin`. An existing deployment has only
 * admins, and nobody would be able to manage users — so the longest-standing
 * admin is promoted once, on first boot after the change.
 */
export async function ensureAnOwnerExists(): Promise<void> {
  const [owner] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.role, "owner")).limit(1);
  if (owner) return;
  const [first] = await db
    .select({ id: adminUsers.id, email: adminUsers.email })
    .from(adminUsers)
    .where(eq(adminUsers.active, true))
    .orderBy(asc(adminUsers.createdAt))
    .limit(1);
  if (!first) return;
  await db.update(adminUsers).set({ role: "owner" }).where(eq(adminUsers.id, first.id));
  logger.info({ email: first.email }, "Promoted the first admin to owner");
}
