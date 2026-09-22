// Adapters mapping the backend API shapes to the legacy data shapes the
// page components were written against. Keeps component bodies unchanged while
// the data source moves from static files to the API.
import { useMemo } from "react";
import {
  useListTourTypes,
  type Tour as ApiTour,
  type BlogPost as ApiBlogPost,
  type BlogPostSummary as ApiBlogPostSummary,
} from "@workspace/api-client-react";
import type { Tour as LegacyTour, TourType } from "@/data/tours";
import type { BlogPost as LegacyBlogPost, BlogSection } from "@/data/blog";

export function formatINR(value: number): string {
  return "₹" + value.toLocaleString("en-IN");
}

/** "water_sports" -> "Water Sports" — fallback used before the live tour
 *  types list has loaded, or for a type slug with no matching lookup row. */
function humanizeSlug(slug: string): string {
  return slug.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map a tour type slug ("rafting") to its admin-authored display label.
 *  Pass the live slug→label map from useTourTypeLabels() when available. */
export function tourTypeLabel(type: string, labels?: Map<string, string>): TourType {
  return labels?.get(type) ?? humanizeSlug(type);
}

/** Live tour-type slug→label lookup (Admin → Tour Types), for resolving
 *  `tour.type` to its exact admin-authored label rather than a guess. */
export function useTourTypeLabels(): Map<string, string> {
  const { data } = useListTourTypes();
  return useMemo(() => new Map((data ?? []).map((t) => [t.slug, t.label])), [data]);
}

/**
 * The words around a trip's price, VL-style: the trip's own label goes before
 * or after the number as the admin chose; with no label of its own, each spot
 * keeps its usual wording (`fallback`). "none" hides every label.
 */
export function priceLabel(
  t: Pick<LegacyTour, "priceLabel" | "priceLabelPosition" | "showAdvertisedPrice">,
  fallback: { before?: string; after?: string } = {},
): { before?: string; after?: string } {
  if (t.showAdvertisedPrice === false || t.priceLabelPosition === "none") return {};
  if (!t.priceLabel) return fallback;
  return t.priceLabelPosition === "after" ? { after: t.priceLabel } : { before: t.priceLabel };
}

export function adaptTour(t: ApiTour, labels?: Map<string, string>): LegacyTour {
  const d = (t.details ?? {}) as Record<string, unknown>;
  const asStr = (v: unknown): string | undefined =>
    typeof v === "string" ? v : undefined;
  return {
    slug: t.slug,
    title: t.title,
    metaTitle: asStr(d.metaTitle) ?? t.seoTitle ?? undefined,
    metaDescription: t.seoDescription ?? undefined,
    // What visitors see: the advertised price when one is set, and nothing
    // numeric at all for a trip quoted on request.
    price: t.showAdvertisedPrice === false ? "Price on request" : formatINR(t.advertisedPrice ?? t.priceValue),
    priceValue: t.priceValue,
    duration: t.duration ?? "",
    location: t.location ?? "",
    type: tourTypeLabel(t.type, labels),
    img: t.images?.[0] ?? t.heroImage ?? "",
    heroImg: t.heroImage ?? t.images?.[0] ?? "",
    tagline: t.tagline ?? "",
    description: t.description ?? "",
    highlights: t.highlights ?? [],
    included: t.included ?? [],
    excluded: t.excluded ?? [],
    difficulty: (t.difficulty as LegacyTour["difficulty"]) ?? undefined,
    groupSize: asStr(d.groupSize),
    minAge: asStr(d.minAge) ?? (t.minAge != null ? String(t.minAge) : undefined),
    maxWeight:
      asStr(d.maxWeight) ?? (t.maxWeightKg != null ? `${t.maxWeightKg} kg` : undefined),
    season: t.season ?? undefined,
    stretchLength: asStr(d.stretchLength),
    rapidGrades: (d.rapidGrades as LegacyTour["rapidGrades"]) ?? undefined,
    activities: (d.activities as string[] | undefined) ?? undefined,
    faqs: (d.faqs as LegacyTour["faqs"]) ?? undefined,

    // Trip-editor fields. `?? undefined` throughout because the API sends null
    // for "not set" and the page layer treats absent and null the same.
    advertisedPrice: t.advertisedPrice ?? undefined,
    showAdvertisedPrice: t.showAdvertisedPrice ?? undefined,
    priceLabelPosition: (t.priceLabelPosition as LegacyTour["priceLabelPosition"]) ?? undefined,
    priceLabel: t.priceLabel?.trim() || undefined,
    showGroupRates: t.showGroupRates ?? undefined,
    trustBadges: Array.isArray(d.trustBadges) && d.trustBadges.length ? (d.trustBadges as string[]) : undefined,
    ownFacts: Array.isArray(d.facts) ? (d.facts as { label?: string; value?: string }[]) : undefined,
    ownFactsReplace: d.factsReplace === true,
    terms: t.terms ?? undefined,
    itinerary: (t.itinerary as LegacyTour["itinerary"]) ?? undefined,
    itineraryText: t.itineraryText ?? undefined,
    shortAddress: t.shortAddress ?? undefined,
    detailedAddress: t.detailedAddress ?? undefined,
    directions: t.directions ?? undefined,
    latitude: t.latitude ?? undefined,
    longitude: t.longitude ?? undefined,
    labels: (t.labels as Record<string, string> | undefined) ?? undefined,
    minParticipants: t.minParticipants ?? undefined,
    maxParticipants: t.maxParticipants ?? undefined,
    ogTitle: t.ogTitle ?? undefined,
    ogDescription: t.ogDescription ?? undefined,
    ogImage: t.ogImage ?? undefined,
  };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Reconstruct heading/body sections from the stored markdown body. */
function bodyToSections(body: string | null | undefined): BlogSection[] {
  if (!body) return [];
  return body.split(/\n\n(?=## )/).map((part) => {
    const m = part.match(/^##\s+(.+?)\n\n([\s\S]*)$/);
    return m ? { heading: m[1], body: m[2] } : { body: part };
  });
}

export function adaptBlogSummary(p: ApiBlogPostSummary): LegacyBlogPost {
  return {
    slug: p.slug,
    title: p.title,
    metaTitle: "",
    metaDesc: "",
    category: p.tags?.[0] ?? "",
    readTime: p.readTime ?? "",
    date: formatDate(p.publishedAt),
    coverImg: p.coverImage ?? "",
    excerpt: p.excerpt ?? "",
    sections: [],
  };
}

export function adaptBlogPost(p: ApiBlogPost): LegacyBlogPost {
  return {
    ...adaptBlogSummary(p),
    metaTitle: p.seoTitle ?? "",
    metaDesc: p.seoDescription ?? "",
    sections: bodyToSections(p.body),
  };
}
