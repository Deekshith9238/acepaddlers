import { Router, type IRouter } from "express";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db, tours, destinations, blogPosts, pages } from "@workspace/db";

const router: IRouter = Router();

/**
 * Site-wide search across published content.
 *
 * Deliberately a simple ILIKE scan rather than full-text: the catalogue is a
 * few dozen rows, so ranking complexity would cost more than it returns, and
 * substring matching handles the partial words people actually type ("rafti").
 */
router.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.json({ query: q, results: [] });
    return;
  }
  const like = `%${q}%`;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const [tourRows, destRows, blogRows, pageRows] = await Promise.all([
    db
      .select({ slug: tours.slug, title: tours.title, blurb: tours.tagline, image: tours.heroImage })
      .from(tours)
      .where(
        and(
          eq(tours.status, "published"),
          or(ilike(tours.title, like), ilike(tours.tagline, like), ilike(tours.description, like), ilike(tours.location, like)),
        ),
      )
      .limit(limit),
    db
      .select({ slug: destinations.slug, title: destinations.name, blurb: destinations.tagline, image: destinations.heroImage })
      .from(destinations)
      .where(
        and(
          eq(destinations.status, "published"),
          or(ilike(destinations.name, like), ilike(destinations.tagline, like), ilike(destinations.description, like)),
        ),
      )
      .limit(limit),
    db
      .select({ slug: blogPosts.slug, title: blogPosts.title, blurb: blogPosts.excerpt, image: blogPosts.coverImage })
      .from(blogPosts)
      .where(and(eq(blogPosts.status, "published"), or(ilike(blogPosts.title, like), ilike(blogPosts.excerpt, like), ilike(blogPosts.body, like))))
      .limit(limit),
    db
      .select({ slug: pages.slug, title: pages.title })
      .from(pages)
      .where(and(eq(pages.status, "published"), or(ilike(pages.title, like), ilike(sql`${pages.data}::text`, like))))
      .limit(limit),
  ]);

  const results = [
    ...tourRows.map((r) => ({ type: "tour", url: `/tours/${r.slug}`, title: r.title, blurb: r.blurb, image: r.image })),
    ...destRows.map((r) => ({ type: "destination", url: `/destinations/${r.slug}`, title: r.title, blurb: r.blurb, image: r.image })),
    ...blogRows.map((r) => ({ type: "blog", url: `/blog/${r.slug}`, title: r.title, blurb: r.blurb, image: r.image })),
    ...pageRows.map((r) => ({ type: "page", url: `/${r.slug}`, title: r.title, blurb: null, image: null })),
  ];

  // A title hit is what the searcher almost always meant; body matches follow.
  const lower = q.toLowerCase();
  results.sort((a, b) => {
    const at = a.title?.toLowerCase().includes(lower) ? 0 : 1;
    const bt = b.title?.toLowerCase().includes(lower) ? 0 : 1;
    return at - bt;
  });

  res.json({ query: q, results: results.slice(0, limit) });
});

export default router;
