import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, tourTypes, tourCategories } from "@workspace/db";
import { CreateTourTypeBody, CreateTourCategoryBody } from "@workspace/api-zod";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("content"));

function isUniqueViolation(e: unknown): boolean {
  const codeOf = (x: unknown): string | undefined =>
    typeof x === "object" && x !== null ? (x as { code?: string }).code : undefined;
  if (codeOf(e) === "23505") return true;
  const cause = typeof e === "object" && e !== null ? (e as { cause?: unknown }).cause : undefined;
  return codeOf(cause) === "23505";
}

/** True if deleting this row would break a tour's foreign key reference. */
function isForeignKeyViolation(e: unknown): boolean {
  const codeOf = (x: unknown): string | undefined =>
    typeof x === "object" && x !== null ? (x as { code?: string }).code : undefined;
  if (codeOf(e) === "23503") return true;
  const cause = typeof e === "object" && e !== null ? (e as { cause?: unknown }).cause : undefined;
  return codeOf(cause) === "23503";
}

// ── Tour types ──
router.get("/tour-types", async (_req, res) => {
  const rows = await db.select().from(tourTypes).orderBy(asc(tourTypes.sortOrder));
  res.json(rows);
});

router.post("/tour-types", async (req, res) => {
  const parsed = CreateTourTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  try {
    const [row] = await db.insert(tourTypes).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (e) {
    if (isUniqueViolation(e)) {
      res.status(409).json({ error: "slug_exists" });
      return;
    }
    throw e;
  }
});

router.patch("/tour-types/:id", async (req, res) => {
  const parsed = CreateTourTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [row] = await db
    .update(tourTypes)
    .set(parsed.data)
    .where(eq(tourTypes.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(row);
});

router.delete("/tour-types/:id", async (req, res) => {
  try {
    const [row] = await db
      .delete(tourTypes)
      .where(eq(tourTypes.id, req.params.id))
      .returning({ id: tourTypes.id });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.status(204).end();
  } catch (e) {
    if (isForeignKeyViolation(e)) {
      res.status(409).json({ error: "in_use" });
      return;
    }
    throw e;
  }
});

// ── Tour categories ──
router.get("/tour-categories", async (_req, res) => {
  const rows = await db.select().from(tourCategories).orderBy(asc(tourCategories.sortOrder));
  res.json(rows);
});

router.post("/tour-categories", async (req, res) => {
  const parsed = CreateTourCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  try {
    const [row] = await db.insert(tourCategories).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (e) {
    if (isUniqueViolation(e)) {
      res.status(409).json({ error: "slug_exists" });
      return;
    }
    throw e;
  }
});

router.patch("/tour-categories/:id", async (req, res) => {
  const parsed = CreateTourCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid", issues: parsed.error.issues });
    return;
  }
  const [row] = await db
    .update(tourCategories)
    .set(parsed.data)
    .where(eq(tourCategories.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(row);
});

router.delete("/tour-categories/:id", async (req, res) => {
  try {
    const [row] = await db
      .delete(tourCategories)
      .where(eq(tourCategories.id, req.params.id))
      .returning({ id: tourCategories.id });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.status(204).end();
  } catch (e) {
    if (isForeignKeyViolation(e)) {
      res.status(409).json({ error: "in_use" });
      return;
    }
    throw e;
  }
});

export default router;
