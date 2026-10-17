import { useCallback, useEffect, useState } from "react";
import { inputCls, labelCls, btnCls, ghostBtnCls } from "./shell";

interface AdminReview {
  id: string;
  authorName: string;
  authorLocation: string | null;
  rating: number;
  body: string;
  reviewedOn: string | null;
  source: string;
  published: boolean;
  sortOrder: number;
}

const SOURCES = ["website", "google", "tripadvisor", "justdial", "facebook", "other"];
const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";
const auth = (): Record<string, string> => {
  const t = localStorage.getItem("admin_token");
  return t ? { authorization: `Bearer ${t}` } : {};
};

const BLANK = { authorName: "", authorLocation: "", rating: 5, body: "", reviewedOn: "", source: "website", published: true };

/**
 * Guest reviews for one trip.
 *
 * These were hand-written in a source file until now, which meant only a
 * developer could add one and — because they fed the page's `aggregateRating`
 * — the site published a star rating nobody had collected.
 *
 * The rating shown here counts only reviews with source "website": reviews
 * left on Google or TripAdvisor belong to those platforms, and folding them
 * into our own rating is against Google's structured-data policy. They can
 * still be displayed, attributed to where they came from.
 */
export default function TripReviews({ tourId }: { tourId: string }) {
  const [rows, setRows] = useState<AdminReview[]>([]);
  const [rating, setRating] = useState<{ value: number | null; count: number }>({ value: null, count: 0 });
  const [draft, setDraft] = useState({ ...BLANK });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`${baseUrl()}/api/admin/tours/${tourId}/reviews`, { headers: auth() });
    if (!res.ok) { setError("Couldn't load reviews."); setLoaded(true); return; }
    const d = await res.json();
    setRows(d.reviews ?? []);
    setRating(d.rating ?? { value: null, count: 0 });
    setLoaded(true);
  }, [tourId]);

  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${baseUrl()}/api/admin/tours/${tourId}/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json", ...auth() },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        // The server's codes are specific; showing them beats "failed".
        setError(String(d.error ?? "save_failed").replace(/_/g, " "));
        return;
      }
      setDraft({ ...BLANK });
      await load();
    } finally { setBusy(false); }
  };

  const patch = async (id: string, body: Partial<AdminReview>) => {
    await fetch(`${baseUrl()}/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...auth() },
      body: JSON.stringify(body),
    });
    await load();
  };

  const remove = async (id: string) => {
    await fetch(`${baseUrl()}/api/admin/reviews/${id}`, { method: "DELETE", headers: auth() });
    await load();
  };

  return (
    <div className="max-w-3xl">
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6">
        <div className="text-sm text-slate-700">
          {rating.value == null ? (
            <>No published reviews yet — the trip page shows no rating, and publishes none in its search-engine markup.</>
          ) : (
            <>
              Published rating <strong>{rating.value}</strong> from <strong>{rating.count}</strong> review
              {rating.count === 1 ? "" : "s"}.
            </>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          Only reviews you collected yourself (source “website”) count towards this. Reviews from Google or
          TripAdvisor are shown on the page with their source, but cannot feed your own rating — Google's rules
          for review markup.
        </p>
      </div>

      {/* ── Add ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Add a review</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={draft.authorName} onChange={(e) => setDraft({ ...draft, authorName: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={draft.authorLocation} onChange={(e) => setDraft({ ...draft, authorLocation: e.target.value })} placeholder="Bengaluru" />
          </div>
          <div>
            <label className={labelCls}>Rating</label>
            <select className={inputCls} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" className={inputCls} value={draft.reviewedOn} onChange={(e) => setDraft({ ...draft, reviewedOn: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Source</label>
            <select className={inputCls} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} />
              Published
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Review</label>
            <textarea className={`${inputCls} min-h-[90px]`} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <button className={`${btnCls} mt-4`} disabled={busy} onClick={add}>{busy ? "Saving…" : "Add review"}</button>
      </div>

      {/* ── Existing ── */}
      {!loaded ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">No reviews for this trip yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800">
                    {r.authorName}
                    {r.authorLocation && <span className="font-normal text-slate-500"> · {r.authorLocation}</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} · {r.source}
                    {r.reviewedOn && <> · {r.reviewedOn}</>}
                    {r.source !== "website" && <span className="ml-1 text-amber-700">(not counted in your rating)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className={ghostBtnCls} onClick={() => patch(r.id, { published: !r.published })}>
                    {r.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    onClick={() => remove(r.id)}>
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{r.body}</p>
              {!r.published && <p className="text-xs text-slate-400 mt-2">Not shown on the site.</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
