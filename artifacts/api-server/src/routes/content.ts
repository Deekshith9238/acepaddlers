import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, destinations, tours, blogPosts, galleryItems } from "@workspace/db";
import type {
  Destination,
  Tour,
  BlogPost,
  BlogPostSummary,
  GalleryItem,
} from "@workspace/api-zod";

const router: IRouter = Router();

const TOUR_TYPES = ["rafting", "camping", "homestay", "water_sports"] as const;
type TourTypeValue = (typeof TOUR_TYPES)[number];

function toDestination(r: typeof destinations.$inferSelect): Destination {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    fullName: r.fullName,
    tagline: r.tagline,
    description: r.description,
    heroImage: r.heroImage,
    images: r.images,
    highlights: r.highlights,
    bestTime: r.bestTime,
    distance: r.distance,
    mapEmbed: r.mapEmbed,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
  };
}

function toTour(r: typeof tours.$inferSelect): Tour {
  return {
    id: r.id,
    slug: r.slug,
    destinationId: r.destinationId,
    type: r.type,
    title: r.title,
    location: r.location,
    tagline: r.tagline,
    description: r.description,
    heroImage: r.heroImage,
    images: r.images,
    priceValue: r.priceValue,
    currency: r.currency,
    duration: r.duration,
    capacityPerSlot: r.capacityPerSlot,
    minAge: r.minAge,
    maxWeightKg: r.maxWeightKg,
    season: r.season,
    difficulty: r.difficulty,
    highlights: r.highlights,
    included: r.included,
    excluded: r.excluded,
    details: r.details,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
  };
}

function toBlogSummary(r: typeof blogPosts.$inferSelect): BlogPostSummary {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    coverImage: r.coverImage,
    author: r.author,
    tags: r.tags,
    readTime: r.readTime,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  };
}

function toBlogPost(r: typeof blogPosts.$inferSelect): BlogPost {
  return { ...toBlogSummary(r), body: r.body, seoTitle: r.seoTitle, seoDescription: r.seoDescription };
}

function toGalleryItem(r: typeof galleryItems.$inferSelect): GalleryItem {
  return {
    id: r.id,
    src: r.src,
    alt: r.alt,
    caption: r.caption,
    category: r.category,
    tall: r.tall,
    sortOrder: r.sortOrder,
    published: r.published,
    layoutX: r.layoutX,
    layoutY: r.layoutY,
    layoutW: r.layoutW,
    layoutH: r.layoutH,
  };
}

// ── Destinations ──
router.get("/destinations", async (_req, res) => {
  const rows = await db
    .select()
    .from(destinations)
    .where(eq(destinations.status, "published"))
    .orderBy(asc(destinations.sortOrder));
  res.json(rows.map(toDestination));
});

router.get("/destinations/:slug", async (req, res) => {
  const [row] = await db
    .select()
    .from(destinations)
    .where(and(eq(destinations.slug, req.params.slug), eq(destinations.status, "published")))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(toDestination(row));
});

// ── Tours ──
router.get("/tours", async (req, res) => {
  const conds = [eq(tours.status, "published")];

  const typeQ = req.query.type;
  if (typeof typeQ === "string") {
    if (!TOUR_TYPES.includes(typeQ as TourTypeValue)) {
      res.status(400).json({ error: "invalid_type" });
      return;
    }
    conds.push(eq(tours.type, typeQ as TourTypeValue));
  }

  const destQ = req.query.destination;
  if (typeof destQ === "string") {
    const [d] = await db
      .select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.slug, destQ))
      .limit(1);
    if (!d) {
      res.json([]);
      return;
    }
    conds.push(eq(tours.destinationId, d.id));
  }

  const rows = await db
    .select()
    .from(tours)
    .where(and(...conds))
    .orderBy(asc(tours.sortOrder));
  res.json(rows.map(toTour));
});

router.get("/tours/:slug", async (req, res) => {
  const [row] = await db
    .select()
    .from(tours)
    .where(and(eq(tours.slug, req.params.slug), eq(tours.status, "published")))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(toTour(row));
});

// ── Blog ──
router.get("/blog", async (_req, res) => {
  const rows = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt));
  res.json(rows.map(toBlogSummary));
});

router.get("/blog/:slug", async (req, res) => {
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, req.params.slug), eq(blogPosts.status, "published")))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(toBlogPost(row));
});

// ── Gallery ──
router.get("/gallery", async (_req, res) => {
  const rows = await db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.published, true))
    .orderBy(asc(galleryItems.sortOrder));
  res.json(rows.map(toGalleryItem));
});

export default router;
