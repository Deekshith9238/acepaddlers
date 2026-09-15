import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, pages, tours } from "@workspace/db";
import { tripPageDocument, tourSlugFromPageSlug } from "../../lib/trip-page-template";
import { SavePageBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("content"));

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
    // Open the builder on the default trip layout instead of a blank canvas.
    // Nothing is written until the editor saves; that first save is what
    // detaches the trip from the template.
    const tourSlug = tourSlugFromPageSlug(req.params.slug);
    if (tourSlug) {
      const [t] = await db.select({ title: tours.title }).from(tours).where(eq(tours.slug, tourSlug)).limit(1);
      if (t) {
        res.json({
          slug: req.params.slug,
          title: t.title,
          data: tripPageDocument(tourSlug),
          status: "draft",
          updatedAt: null,
        });
        return;
      }
    }
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

router.delete("/pages/:slug", async (req, res) => {
  const [row] = await db
    .delete(pages)
    .where(eq(pages.slug, req.params.slug))
    .returning({ slug: pages.slug });
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

export default router;
