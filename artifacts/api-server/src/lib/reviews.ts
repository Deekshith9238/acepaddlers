import { and, asc, desc, eq } from "drizzle-orm";
import { db, reviews, tours } from "@workspace/db";

type ReviewRow = typeof reviews.$inferSelect;

export interface PublicReview {
  id: string;
  authorName: string;
  authorLocation: string | null;
  rating: number;
  body: string;
  reviewedOn: string | null;
  source: string;
}

/**
 * Reviews we collected ourselves.
 *
 * Only these may drive `aggregateRating` in a page's structured data. A review
 * left on Google or JustDial belongs to that platform: showing it with
 * attribution is fine, folding it into our own star rating is not, and Google
 * treats doing so as self-serving markup.
 *
 * Kept as a function rather than a constant so the rule is stated once and
 * every caller asks the same question.
 */
export function isFirstParty(r: Pick<ReviewRow, "source">): boolean {
  return r.source === "website";
}

export function toPublicReview(r: ReviewRow): PublicReview {
  return {
    id: r.id,
    authorName: r.authorName,
    authorLocation: r.authorLocation,
    rating: r.rating,
    body: r.body,
    reviewedOn: r.reviewedOn,
    source: r.source,
  };
}

/** Published reviews for a trip, newest first within the admin's ordering. */
export async function listPublishedReviews(tourId: string): Promise<ReviewRow[]> {
  return db
    .select()
    .from(reviews)
    .where(and(eq(reviews.tourId, tourId), eq(reviews.published, true)))
    .orderBy(asc(reviews.sortOrder), desc(reviews.reviewedOn));
}

export interface RatingSummary {
  /** Rounded to one decimal, or null when there is nothing to average. */
  value: number | null;
  count: number;
}

/**
 * The rating a trip page may publish as structured data.
 *
 * Null when there are no first-party reviews — and the caller must then omit
 * the `aggregateRating` block entirely rather than sending zeros. A rating of
 * 0 from 0 reviews is a claim, and a false one.
 */
export function firstPartyRating(rows: ReviewRow[]): RatingSummary {
  const own = rows.filter(isFirstParty);
  if (own.length === 0) return { value: null, count: 0 };
  const avg = own.reduce((a, r) => a + r.rating, 0) / own.length;
  return { value: Math.round(avg * 10) / 10, count: own.length };
}

export async function tourIdBySlug(slug: string): Promise<string | null> {
  const [row] = await db.select({ id: tours.id }).from(tours).where(eq(tours.slug, slug)).limit(1);
  return row?.id ?? null;
}
