import { Router, type IRouter } from "express";
import { listPublishedReviews, firstPartyRating, toPublicReview, tourIdBySlug } from "../lib/reviews";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, destinations, tours, blogPosts, galleryItems, pages, tourTypes, tourCategories } from "@workspace/db";
import { tripPageDocument, tourSlugFromPageSlug } from "../lib/trip-page-template";
import type {
  Destination,
  Tour,
  BlogPost,
  BlogPostSummary,
  GalleryItem,
  TourType,
  TourCategory,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toTourType(r: typeof tourTypes.$inferSelect): TourType {
  return { id: r.id, slug: r.slug, label: r.label, sortOrder: r.sortOrder };
}

function toTourCategory(r: typeof tourCategories.$inferSelect): TourCategory {
  return { id: r.id, slug: r.slug, label: r.label, sortOrder: r.sortOrder };
}

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

/**
 * The public shape of a trip.
 *
 * This used to stop at the columns the schema had before the trip editor was
 * built, so thirty-five fields an admin could fill in never left the server —
 * advertised price, terms, itinerary, location, labels, the seat-display
 * toggles, the OG tags. The editor saved them, the DB held them, and the site
 * could not see them, which is why edits appeared to do nothing.
 *
 * Everything here is already declared on the `Tour` schema in openapi.yaml, so
 * the contract has not changed — only whether we honour it.
 *
 * Deliberately still a whitelist rather than a spread of the row: `status` and
 * the timestamps are ours, and `confirmationEmailIntro` is the text of an email
 * we send, not something a visitor should be able to read off the API.
 */
function toTour(r: typeof tours.$inferSelect): Tour {
  return {
    id: r.id,
    slug: r.slug,
    destinationId: r.destinationId,
    type: r.type,
    category: r.category,
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
    bookingMode: r.bookingMode as "direct" | "enquiry",
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

    // ── Identity and party size ──
    code: r.code,
    sharedTrip: r.sharedTrip,
    minParticipants: r.minParticipants,
    maxParticipants: r.maxParticipants,

    // ── Pricing display. The rate card still does the arithmetic; these only
    //    decide what the visitor is shown before they pick a date. ──
    advertisedPrice: r.advertisedPrice,
    priceLabelPosition: r.priceLabelPosition as "before" | "after" | "none",
    priceLabel: r.priceLabel,
    showAdvertisedPrice: r.showAdvertisedPrice,
    showGroupRates: r.showGroupRates,
    allowPartialDeposit: r.allowPartialDeposit,
    depositPercent: r.depositPercent,

    // ── Departures ──
    seatSharing: r.seatSharing as "independent" | "reduces" | "closes",
    departureDisplay: r.departureDisplay as "calendar" | "list",
    showSeatsAvailable: r.showSeatsAvailable,
    showSeatsBooked: r.showSeatsBooked,
    showGuaranteedDeparture: r.showGuaranteedDeparture,
    showSeatsToGuarantee: r.showSeatsToGuarantee,
    bookingLeadTimeHours: r.bookingLeadTimeHours,
    paymentDeadlineDays: r.paymentDeadlineDays,

    // ── Content ──
    terms: r.terms,
    // The column is plain jsonb (`unknown[]`) because lib/db does not depend on
    // the API contract. The admin editor is the only writer and writes this
    // shape; a malformed row would render as an empty day, not throw.
    itinerary: r.itinerary as Tour["itinerary"],
    itineraryText: r.itineraryText,
    labels: r.labels,
    relatedTourIds: r.relatedTourIds,

    // ── Where it happens ──
    latitude: r.latitude,
    longitude: r.longitude,
    shortAddress: r.shortAddress,
    detailedAddress: r.detailedAddress,
    directions: r.directions,

    // ── Social preview ──
    ogTitle: r.ogTitle,
    ogDescription: r.ogDescription,
    ogImage: r.ogImage,
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

// ── Tour types / categories (admin-managed lookups) ──
router.get("/tour-types", async (_req, res) => {
  const rows = await db.select().from(tourTypes).orderBy(asc(tourTypes.sortOrder));
  res.json(rows.map(toTourType));
});

router.get("/tour-categories", async (_req, res) => {
  const rows = await db.select().from(tourCategories).orderBy(asc(tourCategories.sortOrder));
  res.json(rows.map(toTourCategory));
});

// ── Tours ──
router.get("/tours", async (req, res) => {
  const conds = [eq(tours.status, "published")];

  // type/category are validated against the tours FK at write time; here we
  // just pass the query value through — an unknown slug simply matches no rows.
  const typeQ = req.query.type;
  if (typeof typeQ === "string") conds.push(eq(tours.type, typeQ));

  const categoryQ = req.query.category;
  if (typeof categoryQ === "string") conds.push(eq(tours.category, categoryQ));

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

/**
 * Reviews for a trip, plus the rating the page may publish.
 *
 * `rating` covers only the reviews we collected ourselves — a Google or
 * TripAdvisor review is shown with its source but must not feed our own
 * `aggregateRating`, which is Google's rule for review markup and the reason
 * the source is tracked at all. `rating.value` is null when there is nothing
 * to average, and the page must then omit the markup rather than publish a
 * zero.
 */
router.get("/tours/:slug/reviews", async (req, res) => {
  const tourId = await tourIdBySlug(req.params.slug);
  if (!tourId) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const rows = await listPublishedReviews(tourId);
  res.json({ reviews: rows.map(toPublicReview), rating: firstPartyRating(rows) });
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

// ── Pages (visual builder) ──
router.get("/pages/:slug", async (req, res) => {
  const [row] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, req.params.slug), eq(pages.status, "published")))
    .limit(1);
  if (!row) {
    // A trip with no saved layout gets the default trip layout rather than a
    // 404, so a newly created trip has a full page the moment it is published.
    const tourSlug = tourSlugFromPageSlug(req.params.slug);
    if (tourSlug) {
      const [t] = await db
        .select({ title: tours.title })
        .from(tours)
        .where(and(eq(tours.slug, tourSlug), eq(tours.status, "published")))
        .limit(1);
      if (t) {
        res.json({
          slug: req.params.slug,
          title: t.title,
          data: tripPageDocument(tourSlug),
          status: "published",
          updatedAt: null,
        });
        return;
      }
    }
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({
    slug: row.slug,
    title: row.title,
    data: row.data,
    status: row.status,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  });
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
