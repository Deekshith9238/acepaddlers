import { eq } from "drizzle-orm";
import { db, adminUsers } from "@workspace/db";
import { hashPassword } from "./auth";
import { logger } from "./logger";

/**
 * Create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD env vars if that
 * email doesn't already exist. No-op when the vars are unset.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  if (existing) return;

  const passwordHash = await hashPassword(password);
  await db.insert(adminUsers).values({
    email,
    passwordHash,
    name: process.env.ADMIN_NAME ?? "Admin",
    role: "admin",
  });
  logger.info({ email }, "Bootstrapped first admin user");
}
