import { eq, sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db, redirects } from "@workspace/db";
import { logger } from "./logger";

type Row = typeof redirects.$inferSelect;

/** Lower-cased, leading slash, no trailing slash, no query string. */
export function normalizePath(raw: string): string {
  let p = String(raw ?? "").trim().toLowerCase();
  p = p.split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

// Redirects sit in front of every request, so they're cached rather than
// queried per hit. The cache is cleared on any write from the admin.
let cache: Map<string, Row> | null = null;
let cacheExpiry = 0;
const TTL_MS = 60_000;

export function invalidateRedirectCache(): void {
  cache = null;
  cacheExpiry = 0;
}

async function activeRedirects(): Promise<Map<string, Row>> {
  if (cache && Date.now() < cacheExpiry) return cache;
  const rows = await db.select().from(redirects).where(eq(redirects.active, true));
  cache = new Map(rows.map((r) => [r.fromPath, r]));
  cacheExpiry = Date.now() + TTL_MS;
  return cache;
}

/**
 * Rules whose destination is itself redirected. A chain costs an extra
 * round-trip and search engines stop following after a few hops — the old
 * platform flagged exactly this (`/blog → /blogpage → /our-blog`).
 */
export function findChains(rows: Row[]): { from: string; to: string; then: string }[] {
  const byFrom = new Map(rows.filter((r) => r.active).map((r) => [r.fromPath, r]));
  const chains: { from: string; to: string; then: string }[] = [];
  for (const r of rows) {
    if (!r.active) continue;
    const next = byFrom.get(normalizePath(r.toPath));
    if (next) chains.push({ from: r.fromPath, to: r.toPath, then: next.toPath });
  }
  return chains;
}

/**
 * Express middleware. Mounted before the API and the SPA fallback so an old
 * URL is answered with a redirect rather than the app's 404 page.
 *
 * Never blocks a request: if the lookup fails the request simply continues.
 */
export function redirectMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // API traffic is never redirected — a moved marketing page must not
    // change how a client talks to the API.
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }
    activeRedirects()
      .then((map) => {
        const hit = map.get(normalizePath(req.path));
        if (!hit) {
          next();
          return;
        }
        // Counted asynchronously; a redirect must not wait on a write.
        db.update(redirects)
          .set({ hits: sql`${redirects.hits} + 1`, lastHitAt: new Date() })
          .where(eq(redirects.id, hit.id))
          .catch((err) => logger.error({ err, id: hit.id }, "redirect hit counter failed"));

        const query = req.originalUrl.includes("?") ? `?${req.originalUrl.split("?")[1]}` : "";
        res.redirect(hit.statusCode, `${hit.toPath}${query}`);
      })
      .catch((err) => {
        logger.error({ err }, "redirect lookup failed");
        next();
      });
  };
}
