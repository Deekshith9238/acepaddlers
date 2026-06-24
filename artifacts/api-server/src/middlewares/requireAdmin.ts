import type { Request, Response, NextFunction } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, adminSessions, adminUsers } from "@workspace/db";
import { SESSION_COOKIE, hashToken } from "../lib/auth";

export type SafeAdmin = {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "editor";
};

/** Resolve the admin for a request from its session cookie, or null. */
export async function loadAdminFromRequest(
  req: Request,
): Promise<SafeAdmin | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token || typeof token !== "string") return null;

  const rows = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      active: adminUsers.active,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(
      and(
        eq(adminSessions.tokenHash, hashToken(token)),
        gt(adminSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const user = rows[0];
  if (!user || !user.active) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Express guard: 401 unless a valid admin session is present. */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const admin = await loadAdminFromRequest(req).catch(() => null);
  if (!admin) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  res.locals.admin = admin;
  next();
}
