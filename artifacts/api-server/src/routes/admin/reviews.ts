import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, reviews, tours } from "@workspace/db";
import { requireAdmin } from "../../middlewares/requireAdmin";
import { requireCapability } from "../../middlewares/requireCapability";
import { firstPartyRating } from "../../lib/reviews";

const router: IRouter = Router();
router.use(requireAdmin, requireCapability("content"));

/** Sources we accept. "website" is the only one that may feed our own rating. */
const SOURCES = ["website", "google", "tripadvisor", "justdial", "facebook", "other"] as const;
type Source = (typeof SOURCES)[number];

function detail(r: typeof reviews.$inferSelect) {
  return {
    id: r.id,
    tourId: r.tourId,
    authorName: r.authorName,
    authorLocation: r.authorLocation,
    rating: r.rating,
    body: r.body,
    reviewedOn: r.reviewedOn,
    source: r.source,
    published: r.published,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * Validate a submitted review.
 *
 * Rating is checked here rather than as a database constraint so a bad value
 * comes back as a message the admin can act on instead of a 500. The body is
 * required and trimmed: a blank review would still count toward the average,
 * which is how a rating drifts without anyone noticing.
 */
function parse(body: unknown, partial: boolean) {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const err = (m: string) => ({ ok: false as const, error: m });
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const out: Record<string, unknown> = {};
  if (!partial || "authorName" in b) {
    const v = str(b.authorName);
    if (!v) return err("author_name_required");
    out.authorName = v;
  }
  if (!partial || "rating" in b) {
    const n = Number(b.rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) return err("rating_must_be_1_to_5");
    out.rating = n;
  }
  if (!partial || "body" in b) {
    const v = str(b.body);
    if (!v) return err("body_required");
    out.body = v;
  }
  if ("authorLocation" in b) out.authorLocation = str(b.authorLocation) || null;
  if ("reviewedOn" in b) {
    const v = str(b.reviewedOn);
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return err("reviewed_on_must_be_yyyy_mm_dd");
    out.reviewedOn = v || null;
  }
  if ("source" in b) {
    const v = str(b.source) as Source;
    if (!SOURCES.includes(v)) return err("unknown_source");
    out.source = v;
  }
  if ("published" in b) out.published = b.published === true;
  if ("sortOrder" in b) out.sortOrder = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0;
  return { ok: true as const, values: out as Partial<typeof reviews.$inferInsert> };
}

/** Every review for a trip, published or not, plus the rating it would produce. */
router.get("/tours/:tourId/reviews", async (req, res) => {
  const rows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.tourId, req.params.tourId))
    .orderBy(asc(reviews.sortOrder), desc(reviews.createdAt));
  const published = rows.filter((r) => r.published);
  res.json({ reviews: rows.map(detail), rating: firstPartyRating(published) });
});

router.post("/tours/:tourId/reviews", async (req, res) => {
  const [tour] = await db.select({ id: tours.id }).from(tours).where(eq(tours.id, req.params.tourId)).limit(1);
  if (!tour) {
    res.status(404).json({ error: "tour_not_found" });
    return;
  }
  const parsed = parse(req.body, false);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [row] = await db
    .insert(reviews)
    .values({ tourId: tour.id, ...parsed.values } as typeof reviews.$inferInsert)
    .returning();
  res.status(201).json(detail(row));
});

router.patch("/reviews/:id", async (req, res) => {
  const parsed = parse(req.body, true);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const [row] = await db
    .update(reviews)
    .set({ ...parsed.values, updatedAt: new Date() })
    .where(eq(reviews.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(detail(row));
});

router.delete("/reviews/:id", async (req, res) => {
  const [row] = await db.delete(reviews).where(eq(reviews.id, req.params.id)).returning();
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.status(204).end();
});

export default router;
