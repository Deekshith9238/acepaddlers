import { eq } from "drizzle-orm";
import { db, settings } from "@workspace/db";

/**
 * Admin-managed hero image lists for static marketing pages, stored as one
 * row in the `settings` table. Value shape: { [pageKey]: string[] }. Each
 * page renders these as a rotating hero carousel; empty/missing falls back
 * to that page's built-in default background.
 */
export const PAGE_IMAGES_KEY = "page_hero_images";

export type PageImagesMap = Record<string, string[]>;

/** Known static page keys shown in the admin editor (informational only — not enforced). */
export const PAGE_IMAGE_KEYS = [
  "home",
  "about",
  "tours",
  "experiences",
  "destinations",
  "gallery",
  "contact",
  "safety",
  "corporate",
] as const;

function sanitize(input: unknown): PageImagesMap {
  const out: PageImagesMap = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof key !== "string" || !key.trim()) continue;
    if (!Array.isArray(value)) continue;
    const urls = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    if (urls.length > 0) out[key] = urls;
  }
  return out;
}

export async function getPageImages(): Promise<PageImagesMap> {
  const [row] = await db.select().from(settings).where(eq(settings.key, PAGE_IMAGES_KEY)).limit(1);
  return sanitize(row?.value);
}

export async function savePageImages(input: unknown): Promise<PageImagesMap> {
  const clean = sanitize(input);
  const now = new Date();
  await db
    .insert(settings)
    .values({ key: PAGE_IMAGES_KEY, value: clean, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: clean, updatedAt: now } });
  return clean;
}
