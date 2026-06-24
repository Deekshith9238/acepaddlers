import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminUsers, adminSessions } from "@workspace/db";
import { AdminLoginBody, AdminLoginResponse, AdminMeResponse } from "@workspace/api-zod";
import {
  verifyPassword,
  generateSessionToken,
  hashToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  sessionCookieOptions,
} from "../../lib/auth";
import { requireAdmin, type SafeAdmin } from "../../middlewares/requireAdmin";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (
    !user ||
    !user.active ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  ) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }

  const token = generateSessionToken();
  await db.insert(adminSessions).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_MS));
  res.json(
    AdminLoginResponse.parse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }),
  );
});

router.post("/auth/logout", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
  }
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions(0));
  res.status(204).end();
});

router.get("/auth/me", requireAdmin, (_req, res) => {
  const admin = res.locals.admin as SafeAdmin;
  res.json(AdminMeResponse.parse(admin));
});

export default router;
