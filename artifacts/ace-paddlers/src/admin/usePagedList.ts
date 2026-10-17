import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "@/admin/adminApi";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const PAGE_SIZES = [25, 50, 100, 200];

/** A value that settles `ms` after the last change — for search boxes. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * One page of an admin list, fetched from the server with limit and offset.
 *
 * The server filters, searches, counts and slices; the browser only ever holds
 * the page on screen. Changing a filter goes back to the first page. Pass
 * `itemsKey` for endpoints that answer `{ <key>: [...], total }` (reviews,
 * redirects) rather than `{ items, total }`; the whole answer is kept as `raw`
 * for anything else it carries.
 */
export function usePagedList<T>(
  path: string,
  params: Record<string, string | number | boolean | null | undefined>,
  opts: { pageSize?: number; itemsKey?: string; enabled?: boolean } = {},
) {
  const [pageSize, setPageSizeState] = useState(opts.pageSize ?? 50);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ items: T[]; total: number; raw: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(params);
  const lastKey = useRef(key);
  const [nonce, setNonce] = useState(0);

  // A new search or filter starts again from the first page.
  if (lastKey.current !== key) {
    lastKey.current = key;
    if (page !== 0) setPage(0);
  }

  useEffect(() => {
    if (opts.enabled === false) return;
    let live = true;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "" && v !== false) qs.set(k, String(v));
    }
    qs.set("limit", String(pageSize));
    qs.set("offset", String(page * pageSize));
    setLoading(true);
    adminApi<any>(`${path}?${qs}`)
      .then((r) => {
        if (!live) return;
        const items = (opts.itemsKey ? r[opts.itemsKey] : r.items) ?? [];
        setData({ items, total: Number(r.total ?? items.length), raw: r });
        setError(null);
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "load_failed"))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
    // `key` stands for the params' contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, page, pageSize, nonce, opts.enabled]);

  const setPageSize = useCallback((n: number) => { setPageSizeState(n); setPage(0); }, []);
  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    raw: data?.raw,
    loaded: data !== null,
    loading,
    error,
    page,
    pageSize,
    setPage,
    setPageSize,
    refetch,
  };
}
