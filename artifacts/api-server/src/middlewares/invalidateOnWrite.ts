import type { Request, Response, NextFunction } from "express";
import { clearSeoCache } from "../lib/seo";
import { logger } from "../lib/logger";

/**
 * Clears the server-rendered page cache after any successful admin write.
 *
 * The public site serves pre-rendered HTML from a 10-minute cache, so without
 * this an edit in the admin simply doesn't appear on the site until the entry
 * expires — the admin and the website disagree for up to ten minutes, and the
 * only cure was a manual "Rebuild SEO" click that nobody would think to make.
 *
 * Applied once to the whole admin router rather than to each route, so a new
 * admin endpoint can't forget to invalidate.
 */
export function invalidateOnWrite(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "GET" || req.method === "HEAD") {
    next();
    return;
  }
  res.on("finish", () => {
    // Only successful writes change anything worth re-rendering.
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        clearSeoCache();
      } catch (err) {
        logger.error({ err, path: req.path }, "SEO cache invalidation failed");
      }
    }
  });
  next();
}
