/**
 * Server-side paging for admin tables.
 *
 * A list asked for with `limit` returns one page and the total that matches,
 * as `{ items, total, limit, offset }`. Asked for without it, an endpoint keeps
 * returning the whole array — dropdowns and older screens rely on that.
 */
export interface Page {
  limit: number;
  offset: number;
}

export const MAX_PAGE = 200;

export function readPage(query: Record<string, unknown>): Page | null {
  if (query.limit === undefined || query.limit === "") return null;
  const limit = Math.floor(Number(query.limit));
  const offset = Math.floor(Number(query.offset ?? 0));
  return {
    limit: Number.isFinite(limit) ? Math.min(MAX_PAGE, Math.max(1, limit)) : 50,
    offset: Number.isFinite(offset) ? Math.max(0, offset) : 0,
  };
}

export const paged = <T>(items: T[], total: number, page: Page) => ({ items, total, limit: page.limit, offset: page.offset });

/** Text from a query parameter, trimmed, or undefined. */
export const qstr = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** `%term%` for ilike, with the wildcards a user might type made literal. */
export const likeTerm = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
