import { useEffect, useState } from "react";

export interface PublicReview {
  id: string;
  authorName: string;
  authorLocation: string | null;
  rating: number;
  body: string;
  reviewedOn: string | null;
  /** "website" for reviews we collected; a platform name otherwise. */
  source: string;
}

export interface ReviewsResponse {
  reviews: PublicReview[];
  /**
   * The rating the page may publish as structured data — first-party reviews
   * only. `value` is null when there is nothing to average, and the page must
   * then omit `aggregateRating` rather than send a zero.
   */
  rating: { value: number | null; count: number };
}

const EMPTY: ReviewsResponse = { reviews: [], rating: { value: null, count: 0 } };
const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

/** Reviews for a trip. Falls back to none — a page must render without them. */
export function useReviews(slug: string | undefined): ReviewsResponse {
  const [data, setData] = useState<ReviewsResponse>(EMPTY);
  useEffect(() => {
    if (!slug) { setData(EMPTY); return; }
    let live = true;
    fetch(`${baseUrl()}/api/tours/${encodeURIComponent(slug)}/reviews`)
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((d: ReviewsResponse) => { if (live) setData(d ?? EMPTY); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [slug]);
  return data;
}

/** Initials for an avatar chip, derived rather than stored. */
export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

/** "March 2025" from a stored date-only value. */
export function reviewDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}
