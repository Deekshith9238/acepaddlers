import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, redirects } from "@workspace/db";
import { CreateRedirectBody, UpdateRedirectBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { normalizePath, findChains, invalidateRedirectCache } from "../../lib/redirects";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("settings"));

type Row = typeof redirects.$inferSelect;
function toDetail(r: Row) {
  return {
    id: r.id,
    fromPath: r.fromPath,
    toPath: r.toPath,
    statusCode: r.statusCode,
    active: r.active,
    hits: r.hits,
    lastHitAt: r.lastHitAt ? r.lastHitAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/redirects", async (_req, res) => {
  const rows = await db.select().from(redirects).orderBy(desc(redirects.createdAt));
  res.json({ redirects: rows.map(toDetail), chains: findChains(rows) });
});

/** Rejects the ways a redirect rule can quietly break a site. */
function validate(from: string, to: string, statusCode: number): string | null {
  if (!from.startsWith("/")) return "from_must_be_a_path";
  if (!to) return "to_required";
  // A destination may be an absolute URL (moving to another domain) or a path.
  if (!to.startsWith("/") && !/^https?:\/\//i.test(to)) return "to_must_be_a_path_or_url";
  if (from === to) return "self_redirect";
  if (statusCode !== 301 && statusCode !== 302) return "invalid_status_code";
  return null;
}

router.post("/redirects", async (req, res) => {
  const parsed = CreateRedirectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const from = normalizePath(parsed.data.fromPath);
  const to = parsed.data.toPath.trim();
  const status = parsed.data.statusCode ?? 301;
  const problem = validate(from, to, status);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  const [clash] = await db.select({ id: redirects.id }).from(redirects).where(eq(redirects.fromPath, from)).limit(1);
  if (clash) {
    res.status(409).json({ error: "from_path_exists" });
    return;
  }
  const [created] = await db
    .insert(redirects)
    .values({ fromPath: from, toPath: to, statusCode: status, active: parsed.data.active ?? true })
    .returning();
  invalidateRedirectCache();
  res.status(201).json(toDetail(created));
});

router.patch("/redirects/:id", async (req, res) => {
  const parsed = UpdateRedirectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [existing] = await db.select().from(redirects).where(eq(redirects.id, req.params.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const b = parsed.data;
  const from = b.fromPath !== undefined ? normalizePath(b.fromPath) : existing.fromPath;
  const to = b.toPath !== undefined ? b.toPath.trim() : existing.toPath;
  const status = b.statusCode ?? existing.statusCode;
  const problem = validate(from, to, status);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  const [updated] = await db
    .update(redirects)
    .set({ fromPath: from, toPath: to, statusCode: status, active: b.active ?? existing.active })
    .where(eq(redirects.id, existing.id))
    .returning();
  invalidateRedirectCache();
  res.json(toDetail(updated));
});

router.delete("/redirects/:id", async (req, res) => {
  const [deleted] = await db.delete(redirects).where(eq(redirects.id, req.params.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  invalidateRedirectCache();
  res.status(204).end();
});

export default router;
