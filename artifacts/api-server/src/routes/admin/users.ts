import { Router, type IRouter } from "express";
import { asc, eq, ne, and } from "drizzle-orm";
import { db, adminUsers, adminSessions } from "@workspace/db";
import { CreateAdminUserBody, UpdateAdminUserBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { hashPassword } from "../../lib/auth";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, capabilitiesFor, type Role } from "../../lib/roles";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("users"));

type Row = typeof adminUsers.$inferSelect;

function toDetail(u: Row) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as Role,
    roleLabel: ROLE_LABELS[u.role as Role] ?? u.role,
    capabilities: capabilitiesFor(u.role),
    active: u.active,
    mustChangePassword: u.mustChangePassword,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  };
}

/** The account performing the request, for self-protection checks. */
function actor(res: { locals: Record<string, unknown> }): { id: string; role: string } {
  return res.locals.admin as { id: string; role: string };
}

async function otherActiveOwnerExists(exceptId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(and(eq(adminUsers.role, "owner"), eq(adminUsers.active, true), ne(adminUsers.id, exceptId)))
    .limit(1);
  return !!row;
}

router.get("/roles", (_req, res) => {
  res.json(
    ROLES.map((r) => ({
      key: r,
      label: ROLE_LABELS[r],
      description: ROLE_DESCRIPTIONS[r],
      capabilities: capabilitiesFor(r),
    })),
  );
});

router.get("/users", async (_req, res) => {
  const rows = await db.select().from(adminUsers).orderBy(asc(adminUsers.createdAt));
  res.json(rows.map(toDetail));
});

router.post("/users", async (req, res) => {
  const parsed = CreateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  const email = b.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }
  if (!ROLES.includes(b.role as Role)) {
    res.status(400).json({ error: "invalid_role" });
    return;
  }
  if ((b.password ?? "").length < 10) {
    res.status(400).json({ error: "password_too_short" });
    return;
  }
  const [clash] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (clash) {
    res.status(409).json({ error: "email_exists" });
    return;
  }

  const [created] = await db
    .insert(adminUsers)
    .values({
      email,
      name: b.name?.trim() || null,
      role: b.role as Role,
      passwordHash: await hashPassword(b.password!),
      // The creator picked this password, so the new user is prompted to
      // replace it with one only they know.
      mustChangePassword: true,
    })
    .returning();
  res.status(201).json(toDetail(created));
});

router.patch("/users/:id", async (req, res) => {
  const parsed = UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;
  const me = actor(res);
  const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.params.id)).limit(1);
  if (!target) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  if (b.role !== undefined && !ROLES.includes(b.role as Role)) {
    res.status(400).json({ error: "invalid_role" });
    return;
  }
  // Locking yourself out is the mistake worth preventing outright.
  if (target.id === me.id && b.active === false) {
    res.status(409).json({ error: "cannot_deactivate_self" });
    return;
  }
  if (target.id === me.id && b.role !== undefined && b.role !== target.role) {
    res.status(409).json({ error: "cannot_change_own_role" });
    return;
  }
  // …and so is leaving the system with nobody who can manage staff.
  const losingOwner =
    target.role === "owner" && ((b.role !== undefined && b.role !== "owner") || b.active === false);
  if (losingOwner && !(await otherActiveOwnerExists(target.id))) {
    res.status(409).json({ error: "last_owner" });
    return;
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (b.name !== undefined) patch.name = b.name?.trim() || null;
  if (b.role !== undefined) patch.role = b.role;
  if (b.active !== undefined) patch.active = b.active;
  if (b.password) {
    if (b.password.length < 10) {
      res.status(400).json({ error: "password_too_short" });
      return;
    }
    patch.passwordHash = await hashPassword(b.password);
    patch.mustChangePassword = target.id !== me.id;
  }

  const [updated] = await db.update(adminUsers).set(patch).where(eq(adminUsers.id, target.id)).returning();
  // Deactivating or re-crediting someone must take effect immediately, not
  // whenever their session happens to expire.
  if (b.active === false || b.password) {
    await db.delete(adminSessions).where(eq(adminSessions.userId, target.id));
  }
  res.json(toDetail(updated));
});

router.delete("/users/:id", async (req, res) => {
  const me = actor(res);
  if (req.params.id === me.id) {
    res.status(409).json({ error: "cannot_delete_self" });
    return;
  }
  const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, req.params.id)).limit(1);
  if (!target) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (target.role === "owner" && !(await otherActiveOwnerExists(target.id))) {
    res.status(409).json({ error: "last_owner" });
    return;
  }
  await db.delete(adminSessions).where(eq(adminSessions.userId, target.id));
  await db.delete(adminUsers).where(eq(adminUsers.id, target.id));
  res.status(204).end();
});

export default router;
