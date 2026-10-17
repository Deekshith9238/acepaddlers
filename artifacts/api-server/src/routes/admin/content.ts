import { Router, type IRouter } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, destinations, tours, blogPosts, galleryItems } from "@workspace/db";
import {
  CreateDestinationBody,
  CreateTourBody,
  CreateBlogPostBody,
  CreateGalleryItemBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";

const router: IRouter = Router();

// All routes below require a valid admin session.
router.use(requireAdmin, requireCapability("content"));

function isUniqueViolation(e: unknown): boolean {
  // node-postgres sets code "23505" on unique violations; drizzle wraps the
  // original error, so the code may live on `e` or on `e.cause`.
  const codeOf = (x: unknown): string | undefined =>
    typeof x === "object" && x !== null ? (x as { code?: string }).code : undefined;
  if (codeOf(e) === "23505") return true;
  const cause = typeof e === "object" && e !== null ? (e as { cause?: unknown }).cause : undefined;
  return codeOf(cause) === "23505";
}

// ── Destinations ──
router.get("/destinations", async (_req, res) => {
  const rows = await db.select().from(destinations).orderBy(asc(destinations.sortOrder));
  res.json(rows);
});

router.post("/destinations", async (req, res) => {
  const parsed = CreateDestinationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  try {
    const [row] = await db.insert(destinations).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (e) {
    if (isUniqueViolation(e)) {
      res.status(409).json({ error: "slug_exists" });
      return;
    }
    throw e;
  }
});

router.patch("/destinations/:id", async (req, res) => {
  const parsed = CreateDestinationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [row] = await db
    .update(destinations)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(destinations.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(row);
});

router.delete("/destinations/:id", async (req, res) => {
  const [row] = await db
    .delete(destinations)
    .where(eq(destinations.id, req.params.id))
    .returning({ id: destinations.id });
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

// ── Tours ──
router.get("/tours", async (_req, res) => {
  const rows = await db.select().from(tours).orderBy(asc(tours.sortOrder));
  res.json(rows);
});

router.post("/tours", async (req, res) => {
  const parsed = CreateTourBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  try {
    const [row] = await db.insert(tours).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (e) {
    if (isUniqueViolation(e)) {
      res.status(409).json({ error: "slug_exists" });
      return;
    }
    throw e;
  }
});

// The trip editor saves one tab at a time, so a PATCH carries only the fields
// that tab owns — requiring the whole tour would make every tab resend the
// others and quietly clobber concurrent edits.
const PatchTourBody = CreateTourBody.partial();

router.patch("/tours/:id", async (req, res) => {
  const parsed = PatchTourBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const { details, ...rest } = parsed.data;
  const set: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (details) {
    // `details` is a bag of unrelated keys (FAQs, rapid grades, group size,
    // meta title…) owned by different tabs. Replacing the column would let a
    // tab that saves FAQs silently delete everything else in it, so merge in
    // SQL instead: one statement, so two tabs saving at once cannot lose each
    // other's keys. A key sent as null is removed.
    const keep = Object.fromEntries(Object.entries(details).filter(([, v]) => v !== null));
    const drop = Object.entries(details).filter(([, v]) => v === null).map(([k]) => k);
    // Both lists go in as single JSON parameters. Drizzle expands an
    // interpolated array into "($1, $2)", which is not a text[] — and an empty
    // one, the usual case, becomes "()" and would fail every save.
    set.details = sql`(coalesce(${tours.details}, '{}'::jsonb) || ${JSON.stringify(keep)}::jsonb)
      - (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(${JSON.stringify(drop)}::jsonb) x)`;
  }
  const [row] = await db
    .update(tours)
    .set(set)
    .where(eq(tours.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(row);
});

router.delete("/tours/:id", async (req, res) => {
  const [row] = await db
    .delete(tours)
    .where(eq(tours.id, req.params.id))
    .returning({ id: tours.id });
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

// ── Blog ──
router.get("/blog", async (_req, res) => {
  const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt));
  res.json(rows);
});

router.post("/blog", async (req, res) => {
  const parsed = CreateBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const values = {
    ...parsed.data,
    publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null,
  };
  try {
    const [row] = await db.insert(blogPosts).values(values).returning();
    res.status(201).json(row);
  } catch (e) {
    if (isUniqueViolation(e)) {
      res.status(409).json({ error: "slug_exists" });
      return;
    }
    throw e;
  }
});

router.patch("/blog/:id", async (req, res) => {
  const parsed = CreateBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const values = {
    ...parsed.data,
    publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null,
    updatedAt: new Date(),
  };
  const [row] = await db
    .update(blogPosts)
    .set(values)
    .where(eq(blogPosts.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(row);
});

router.delete("/blog/:id", async (req, res) => {
  const [row] = await db
    .delete(blogPosts)
    .where(eq(blogPosts.id, req.params.id))
    .returning({ id: blogPosts.id });
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

// ── Gallery ──
router.get("/gallery", async (_req, res) => {
  const rows = await db.select().from(galleryItems).orderBy(asc(galleryItems.sortOrder));
  res.json(rows);
});

router.post("/gallery", async (req, res) => {
  const parsed = CreateGalleryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(galleryItems).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/gallery/:id", async (req, res) => {
  const parsed = CreateGalleryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [row] = await db
    .update(galleryItems)
    .set(parsed.data)
    .where(eq(galleryItems.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(row);
});

router.delete("/gallery/:id", async (req, res) => {
  const [row] = await db
    .delete(galleryItems)
    .where(eq(galleryItems.id, req.params.id))
    .returning({ id: galleryItems.id });
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

export default router;
