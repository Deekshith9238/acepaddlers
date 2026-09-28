/* eslint-disable @typescript-eslint/no-explicit-any -- Google's JSON, read field by field below */
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, reviews, settings } from "@workspace/db";
import { getSiteConfig } from "./site-config";
import { logger } from "./logger";
import { notifyNewReviews } from "./notify";

/**
 * Google reviews, brought in for the team to approve.
 *
 * A review left on one of the business's Google listings is imported as
 * waiting; nothing reaches the public Reviews page until someone in the admin
 * approves it. The one exception is a listing's first import, which publishes
 * what that listing already shows — those reviews have been public on Google
 * for years, and the page should not open empty. Per listing, so one connected
 * later gets the same treatment.
 *
 * Google only ever hands out five reviews per listing per request, so each
 * check asks twice: the newest five, which is how a new review is caught the
 * day it is written, and the most relevant five. Everything imported is kept,
 * so the page grows as reviews arrive — it can never hold Google's full
 * history, which is only available to the listing's owner through the
 * Business Profile API.
 *
 * Uses the site's Maps key. It is a browser key, locked to the site's own
 * domains, so the requests say which site they are from.
 */

export const GOOGLE_REVIEWS_KEY = "google_reviews";

export interface GooglePlace {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
  mapsUrl: string | null;
}

interface GoogleReviewsState {
  places: GooglePlace[];
  /** Listings whose first import has run; see the note on the module. */
  seededPlaceIds: string[];
  lastCheckedAt: string | null;
  lastError: string | null;
}


export async function getGoogleReviewsState(): Promise<GoogleReviewsState> {
  const [row] = await db.select().from(settings).where(eq(settings.key, GOOGLE_REVIEWS_KEY)).limit(1);
  const v = (row?.value ?? {}) as Partial<GoogleReviewsState>;
  return {
    places: Array.isArray(v.places) ? v.places : [],
    seededPlaceIds: Array.isArray(v.seededPlaceIds) ? v.seededPlaceIds.filter((x): x is string => typeof x === "string") : [],
    lastCheckedAt: typeof v.lastCheckedAt === "string" ? v.lastCheckedAt : null,
    lastError: typeof v.lastError === "string" ? v.lastError : null,
  };
}

async function saveState(state: GoogleReviewsState): Promise<void> {
  const now = new Date();
  await db
    .insert(settings)
    .values({ key: GOOGLE_REVIEWS_KEY, value: state, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: state, updatedAt: now } });
}

const siteOrigin = () => (process.env.PUBLIC_SITE_URL || "https://www.acepaddlers.com").replace(/\/+$/, "") + "/";

async function mapsKey(): Promise<string> {
  const key = (await getSiteConfig()).mapsApiKey;
  if (!key) throw new Error("no_maps_key");
  return key;
}

/** Find listings by name, so the admin picks one rather than hunting for an id. */
export async function searchGooglePlaces(query: string): Promise<GooglePlace[]> {
  const key = await mapsKey();
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri",
      Referer: siteOrigin(),
    },
    body: JSON.stringify({ textQuery: query }),
  });
  const data = (await res.json()) as { places?: any[]; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `places_search_${res.status}`);
  return (data.places ?? []).slice(0, 8).map((p) => ({
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    rating: typeof p.rating === "number" ? p.rating : null,
    ratingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    mapsUrl: p.googleMapsUri ?? null,
  }));
}

export async function setGooglePlaces(places: GooglePlace[]): Promise<GoogleReviewsState> {
  const state = await getGoogleReviewsState();
  const clean = places
    .filter((p) => p && typeof p.placeId === "string" && /^[A-Za-z0-9_-]{10,}$/.test(p.placeId))
    .map((p) => ({
      placeId: p.placeId,
      name: String(p.name ?? "").slice(0, 200),
      address: String(p.address ?? "").slice(0, 300),
      rating: typeof p.rating === "number" ? p.rating : null,
      ratingCount: typeof p.ratingCount === "number" ? p.ratingCount : null,
      mapsUrl: typeof p.mapsUrl === "string" && p.mapsUrl.startsWith("https://") ? p.mapsUrl : null,
    }));
  const next = { ...state, places: clean };
  await saveState(next);
  return next;
}

interface Incoming {
  externalId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  body: string;
  reviewedOn: string | null;
}

/** One reviewer's contributor id, which both Google APIs expose in their profile link. */
const contributor = (url: unknown): string | null =>
  typeof url === "string" ? (url.match(/\/contrib\/(\d+)/)?.[1] ?? null) : null;

/** The newest five, from the Places endpoint that can still sort that way. */
async function newestReviews(key: string, placeId: string): Promise<{ reviews: Incoming[]; rating: number | null; count: number | null }> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.search = new URLSearchParams({
    place_id: placeId,
    fields: "reviews,rating,user_ratings_total",
    reviews_sort: "newest",
    reviews_no_translations: "true",
    key,
  }).toString();
  const res = await fetch(url, { headers: { Referer: siteOrigin() } });
  const data = (await res.json()) as { status?: string; error_message?: string; result?: any };
  if (data.status !== "OK") throw new Error(data.error_message ?? `place_details_${data.status}`);
  const r = data.result ?? {};
  return {
    rating: typeof r.rating === "number" ? r.rating : null,
    count: typeof r.user_ratings_total === "number" ? r.user_ratings_total : null,
    reviews: (r.reviews ?? []).flatMap((v: any): Incoming[] => {
      const who = contributor(v.author_url);
      const text = String(v.text ?? "").trim();
      if (!who || !text) return [];
      return [{
        externalId: `google:${placeId}:${who}`,
        authorName: String(v.author_name ?? "Google user"),
        authorPhotoUrl: typeof v.profile_photo_url === "string" ? v.profile_photo_url : null,
        rating: Number(v.rating),
        body: text,
        reviewedOn: typeof v.time === "number" ? new Date(v.time * 1000).toISOString().slice(0, 10) : null,
      }];
    }),
  };
}

/** The five Google considers most relevant. */
async function relevantReviews(key: string, placeId: string): Promise<Incoming[]> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "reviews", Referer: siteOrigin() },
  });
  const data = (await res.json()) as { reviews?: any[]; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `place_${res.status}`);
  return (data.reviews ?? []).flatMap((v: any): Incoming[] => {
    const who = contributor(v.authorAttribution?.uri);
    const text = String(v.originalText?.text ?? v.text?.text ?? "").trim();
    if (!who || !text) return [];
    return [{
      externalId: `google:${placeId}:${who}`,
      authorName: String(v.authorAttribution?.displayName ?? "Google user"),
      authorPhotoUrl: typeof v.authorAttribution?.photoUri === "string" ? v.authorAttribution.photoUri : null,
      rating: Number(v.rating),
      body: text,
      reviewedOn: typeof v.publishTime === "string" ? v.publishTime.slice(0, 10) : null,
    }];
  });
}

/**
 * Check every connected listing and import what is new.
 *
 * Star-only reviews are skipped: the page is for what guests said, and a row
 * of five stars with nothing under them tells a reader nothing. A reviewer
 * already imported is left alone — Google keeps one review per person per
 * listing, and an approved review must not change under the admin afterwards.
 */
export async function importGoogleReviews(): Promise<{ added: number; places: number }> {
  const state = await getGoogleReviewsState();
  if (state.places.length === 0) return { added: 0, places: 0 };
  const key = await mapsKey();
  const now = new Date();
  let added = 0;
  const places: GooglePlace[] = [];
  /** What arrived waiting for a decision — the team hears about these. */
  const waiting: { authorName: string; rating: number; body: string; listing: string }[] = [];

  try {
    for (const place of state.places) {
      const [newest, relevant] = await Promise.all([newestReviews(key, place.placeId), relevantReviews(key, place.placeId)]);
      places.push({ ...place, rating: newest.rating ?? place.rating, ratingCount: newest.count ?? place.ratingCount });
      // A listing's first import publishes what Google already shows; after
      // that, everything new waits for the admin.
      const publishNow = !state.seededPlaceIds.includes(place.placeId);
      const seen = new Set<string>();
      for (const r of [...newest.reviews, ...relevant]) {
        if (seen.has(r.externalId) || !Number.isInteger(r.rating) || r.rating < 1 || r.rating > 5) continue;
        seen.add(r.externalId);
        const inserted = await db
          .insert(reviews)
          .values({
            tourId: null,
            source: "google",
            authorName: r.authorName.slice(0, 120),
            authorPhotoUrl: r.authorPhotoUrl,
            rating: r.rating,
            body: r.body,
            reviewedOn: r.reviewedOn,
            externalId: r.externalId,
            published: publishNow,
            moderatedAt: publishNow ? now : null,
          })
          .onConflictDoNothing({ target: reviews.externalId })
          .returning({ id: reviews.id });
        added += inserted.length;
        if (inserted.length && !publishNow) {
          waiting.push({ authorName: r.authorName, rating: r.rating, body: r.body, listing: place.name });
        }
      }
    }
  } catch (err) {
    await saveState({ ...state, lastCheckedAt: now.toISOString(), lastError: err instanceof Error ? err.message : String(err) });
    throw err;
  }

  await saveState({
    places,
    seededPlaceIds: [...new Set([...state.seededPlaceIds, ...places.map((p) => p.placeId)])],
    lastCheckedAt: now.toISOString(),
    lastError: null,
  });
  // Never let a failed email or WhatsApp undo an import that worked.
  notifyNewReviews(waiting).catch((err) => logger.error({ err }, "new review alert failed"));
  return { added, places: places.length };
}

/** Approved reviews for the public page, newest first, plus Google's own totals. */
export async function publicReviews() {
  const [rows, state] = await Promise.all([
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.published, true), sql`${reviews.moderatedAt} is not null`))
      .orderBy(desc(reviews.reviewedOn), desc(reviews.createdAt))
      .limit(200),
    getGoogleReviewsState(),
  ]);
  return {
    reviews: rows.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      authorLocation: r.authorLocation,
      authorPhotoUrl: r.authorPhotoUrl,
      rating: r.rating,
      body: r.body,
      reviewedOn: r.reviewedOn,
      source: r.source,
    })),
    listings: state.places.map((p) => ({
      name: p.name,
      rating: p.rating,
      ratingCount: p.ratingCount,
      mapsUrl: p.mapsUrl,
      writeReviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(p.placeId)}`,
    })),
  };
}

/** How many imports are waiting for a decision — the badge in the admin menu. */
export async function pendingReviewCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reviews)
    .where(isNull(reviews.moderatedAt));
  return row?.n ?? 0;
}

/** Twice a day is plenty: a review waits for the admin anyway. */
export function startGoogleReviewsScheduler(): void {
  const tick = () => {
    importGoogleReviews()
      .then(({ added }) => { if (added > 0) logger.info({ added }, "imported google reviews"); })
      .catch((err) => {
        if (err instanceof Error && err.message === "no_maps_key") return;
        logger.error({ err }, "google reviews import failed");
      });
  };
  setTimeout(tick, 60_000);
  setInterval(tick, 12 * 60 * 60 * 1000);
}
