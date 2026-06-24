// Adapters mapping the backend API shapes to the legacy data shapes the
// page components were written against. Keeps component bodies unchanged while
// the data source moves from static files to the API.
import type {
  Tour as ApiTour,
  BlogPost as ApiBlogPost,
  BlogPostSummary as ApiBlogPostSummary,
} from "@workspace/api-client-react";
import type { Tour as LegacyTour, TourType } from "@/data/tours";
import type { BlogPost as LegacyBlogPost, BlogSection } from "@/data/blog";

export function formatINR(value: number): string {
  return "₹" + value.toLocaleString("en-IN");
}

const TYPE_LABEL: Record<string, TourType> = {
  rafting: "Rafting",
  camping: "Camping",
  homestay: "Homestay",
  water_sports: "Water Sports",
};

/** Map a TourType enum value ("rafting") to its display label ("Rafting"). */
export function tourTypeLabel(type: string): TourType {
  return TYPE_LABEL[type] ?? "Rafting";
}

export function adaptTour(t: ApiTour): LegacyTour {
  const d = (t.details ?? {}) as Record<string, unknown>;
  const asStr = (v: unknown): string | undefined =>
    typeof v === "string" ? v : undefined;
  return {
    slug: t.slug,
    title: t.title,
    metaTitle: asStr(d.metaTitle) ?? t.seoTitle ?? undefined,
    metaDescription: t.seoDescription ?? undefined,
    price: formatINR(t.priceValue),
    priceValue: t.priceValue,
    duration: t.duration ?? "",
    location: t.location ?? "",
    type: tourTypeLabel(t.type),
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
