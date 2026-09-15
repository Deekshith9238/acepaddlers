import { sql } from "drizzle-orm";
import { db, tours, destinations, galleryItems, blogPosts, pages } from "@workspace/db";

/**
 * How many places reference each media URL.
 *
 * Content lives across half a dozen tables, some of it inside jsonb (a tour's
 * image array, a builder page's whole document), so this searches the
 * serialised form of each row rather than trying to enumerate every field that
 * could hold a URL. Coarse, but it never misses a reference — and a false
 * "in use" is far safer than letting someone delete a live banner.
 */
export async function mediaUsageCounts(urls: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>(urls.map((u) => [u, 0]));
  if (urls.length === 0) return counts;

  // One pass per table, collecting the searchable text of every row.
  const haystacks: string[] = [];
  const [tourRows, destRows, galleryRows, blogRows, pageRows] = await Promise.all([
    db.select({ blob: sql<string>`coalesce(${tours.heroImage},'') || ' ' || ${tours.images}::text` }).from(tours),
    db.select({ blob: sql<string>`coalesce(${destinations.heroImage},'') || ' ' || ${destinations.images}::text` }).from(destinations),
    db.select({ blob: sql<string>`coalesce(${galleryItems.src}, '')` }).from(galleryItems),
    db.select({ blob: sql<string>`coalesce(${blogPosts.coverImage}, '') || ' ' || coalesce(${blogPosts.body}, '')` }).from(blogPosts),
    db.select({ blob: sql<string>`${pages.data}::text` }).from(pages),
  ]);
  for (const set of [tourRows, destRows, galleryRows, blogRows, pageRows]) {
    for (const r of set) if (r.blob) haystacks.push(r.blob);
  }

  for (const url of urls) {
    if (!url) continue;
    let n = 0;
    for (const hay of haystacks) if (hay.includes(url)) n++;
    counts.set(url, n);
  }
  return counts;
}
