import { PAGE_SIZES } from "./usePagedList";

/**
 * "Showing 51–100 of 2,340", previous / next, a page jump and rows per page —
 * the same control under every admin table.
 */
export default function Pager({
  page,
  pageSize,
  total,
  loading,
  onPage,
  onPageSize,
  noun = "results",
}: {
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const btn = "rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-xs text-slate-500">
      <span>
        {total === 0 ? `No ${noun}` : <>Showing <b className="text-slate-700">{from.toLocaleString("en-IN")}–{to.toLocaleString("en-IN")}</b> of <b className="text-slate-700">{total.toLocaleString("en-IN")}</b> {noun}</>}
        {loading && <span className="ml-2 text-slate-400">· loading…</span>}
      </span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1">
          Rows
          <select className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="button" className={btn} disabled={page === 0} onClick={() => onPage(0)} aria-label="First page">«</button>
        <button type="button" className={btn} disabled={page === 0} onClick={() => onPage(page - 1)}>‹ Prev</button>
        <span>
          Page{" "}
          <select className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs" value={page} onChange={(e) => onPage(Number(e.target.value))} aria-label="Page">
            {Array.from({ length: Math.min(pages, 500) }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}
          </select>{" "}
          of {pages.toLocaleString("en-IN")}
        </span>
        <button type="button" className={btn} disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next ›</button>
        <button type="button" className={btn} disabled={page >= pages - 1} onClick={() => onPage(pages - 1)} aria-label="Last page">»</button>
      </div>
    </div>
  );
}
