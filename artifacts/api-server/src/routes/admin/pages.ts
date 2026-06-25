import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, pages } from "@workspace/db";
import { SavePageBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";

const router: IRouter = Router();
router.use(requireAdmin);

function toPage(row: typeof pages.$inferSelect) {
  return {
    slug: row.slug,
    title: row.title,
    data: row.data,
    status: row.status,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

router.get("/pages", async (_req, res) => {
  const rows = await db.select().from(pages).orderBy(asc(pages.slug));
  res.json(rows.map((r) => ({ slug: r.slug, title: r.title, status: r.status })));
});

router.get("/pages/:slug", async (req, res) => {
  const [row] = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(toPage(row));
});

router.put("/pages/:slug", async (req, res) => {
  const parsed = SavePageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const slug = req.params.slug;
  const values = {
    slug,
    title: parsed.data.title ?? slug,
    data: parsed.data.data as Record<string, unknown>,
    status: parsed.data.status ?? "draft",
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(pages)
    .values(values)
    .onConflictDoUpdate({
      target: pages.slug,
      set: { title: values.title, data: values.data, status: values.status, updatedAt: values.updatedAt },
    })
    .returning();
  res.json(toPage(row));
});

export default router;
