import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Star } from "lucide-react";

/**
 * Reviews waiting for a decision, and the Google listings they come from.
 *
 * A review imported from Google arrives here as waiting and reaches the public
 * Reviews page only once someone approves it. Hiding is a decision too — it
 * leaves the queue and can be shown again later from the Hidden tab.
 */

interface AdminReview {
  id: string;
  authorName: string;
  authorLocation: string | null;
  authorPhotoUrl: string | null;
  rating: number;
  body: string;
  reviewedOn: string | null;
  source: string;
  published: boolean;
  tourTitle: string | null;
}

interface Place {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
  mapsUrl: string | null;
}

interface GoogleState {
  places: Place[];
  lastCheckedAt: string | null;
  lastError: string | null;
  pending: number;
}

const baseUrl = (): string => (import.meta.env.VITE_API_URL as string) || "";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${baseUrl()}/api/admin${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? `HTTP ${res.status}`);
  return body as T;
}

const TABS = [
  { key: "pending", label: "Waiting" },
  { key: "published", label: "Shown" },
  { key: "hidden", label: "Hidden" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const btn = "rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50";

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className="h-3.5 w-3.5" style={{ color: "#f5b301", fill: n <= value ? "#f5b301" : "transparent" }} />
      ))}
    </span>
  );
}

function GoogleCard({ state, onChange }: { state: GoogleState | null; onChange: () => void }) {
  const [query, setQuery] = useState("Ace Paddlers");
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const places = state?.places ?? [];

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage(err instanceof Error && err.message === "no_maps_key"
        ? "Add a Google Maps key under Settings → Google Maps first."
        : `Google said: ${err instanceof Error ? err.message : "something went wrong"}`);
    } finally {
      setBusy(null);
    }
  };

  const save = (next: Place[]) => run("save", async () => {
    await api("/google-reviews/places", { method: "PUT", body: JSON.stringify({ places: next }) });
    onChange();
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Google listings</h2>
          <p className="mt-1 text-sm text-slate-500">
            New reviews on these listings are brought in twice a day and wait below for your approval.
          </p>
        </div>
        <button type="button" disabled={!places.length || !!busy}
          className={`${btn} bg-cyan-600 text-white hover:bg-cyan-700`}
          onClick={() => run("import", async () => {
            const r = await api<{ added: number }>("/google-reviews/import", { method: "POST" });
            setMessage(r.added ? `${r.added} new review${r.added === 1 ? "" : "s"} brought in.` : "Nothing new on Google.");
            onChange();
          })}>
          {busy === "import" ? "Checking…" : "Check Google now"}
        </button>
      </div>

      {places.length > 0 && (
        <ul className="mt-4 space-y-2">
          {places.map((p) => (
            <li key={p.placeId} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800">{p.name}</div>
                <div className="truncate text-xs text-slate-400">{p.address}</div>
              </div>
              {p.rating != null && (
                <span className="shrink-0 text-sm text-slate-600">{p.rating.toFixed(1)} ★ · {p.ratingCount}</span>
              )}
              <button type="button" disabled={!!busy} className={`${btn} border border-slate-300 text-slate-600 hover:bg-slate-50`}
                onClick={() => save(places.filter((x) => x.placeId !== p.placeId))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Add a listing</label>
        <div className="flex gap-2">
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("gr-search")?.click(); }}
            placeholder="Your business name as it appears on Google" />
          <button id="gr-search" type="button" disabled={!query.trim() || !!busy}
            className={`${btn} shrink-0 border border-slate-300 text-slate-700 hover:bg-slate-50`}
            onClick={() => run("search", async () => {
              const r = await api<{ places: Place[] }>("/google-reviews/search", { method: "POST", body: JSON.stringify({ query }) });
              setResults(r.places);
            })}>
            {busy === "search" ? "Searching…" : "Search"}
          </button>
        </div>
        {results && (
          <ul className="mt-3 space-y-2">
            {results.length === 0 && <li className="text-sm text-slate-400">No listings found.</li>}
            {results.map((p) => {
              const added = places.some((x) => x.placeId === p.placeId);
              return (
                <li key={p.placeId} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-800">{p.name}</div>
                    <div className="truncate text-xs text-slate-400">{p.address}</div>
                  </div>
                  {p.rating != null && <span className="shrink-0 text-sm text-slate-600">{p.rating.toFixed(1)} ★ · {p.ratingCount}</span>}
                  <button type="button" disabled={added || !!busy}
                    className={`${btn} bg-slate-800 text-white hover:bg-slate-900`}
                    onClick={() => save([...places, p])}>
                    {added ? "Added" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        {state?.lastCheckedAt ? `Last checked ${new Date(state.lastCheckedAt).toLocaleString()}.` : "Not checked yet."}{" "}
        Google shares at most ten reviews per listing per check — its newest five and five it picks — so older
        reviews arrive only as they resurface. A listing's first check publishes what it already shows on Google;
        after that, every new review waits here.
      </p>
      {(message || state?.lastError) && (
        <p className="mt-2 text-sm" style={{ color: message && !message.startsWith("Google said") ? "#047857" : "#b91c1c" }}>
          {message ?? `Last check failed: ${state?.lastError}`}
        </p>
      )}
    </div>
  );
}

export default function AdminReviews() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<AdminReview[] | null>(null);
  const [google, setGoogle] = useState<GoogleState | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ reviews: AdminReview[] }>(`/reviews?status=${tab}`).then((r) => setRows(r.reviews)).catch(() => setRows([]));
    api<GoogleState>("/google-reviews").then(setGoogle).catch(() => undefined);
  }, [tab]);

  useEffect(() => { setRows(null); load(); }, [load]);

  const decide = async (id: string, action: "approve" | "hide") => {
    setWorking(id);
    try {
      await api(`/reviews/${id}/${action}`, { method: "POST" });
      setRows((r) => r?.filter((x) => x.id !== id) ?? r);
      api<GoogleState>("/google-reviews").then(setGoogle).catch(() => undefined);
    } finally {
      setWorking(null);
    }
  };

  const approveAll = async () => {
    for (const r of rows ?? []) await decide(r.id, "approve");
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Reviews</h1>
        <a href="/reviews" target="_blank" rel="noreferrer" className="text-sm font-semibold text-cyan-700 no-underline hover:underline">
          View the Reviews page ↗
        </a>
      </div>

      <GoogleCard state={google} onChange={load} />

      <div className="mt-8 flex items-center gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === t.key ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t.label}
            {t.key === "pending" && !!google?.pending && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{google.pending}</span>
            )}
          </button>
        ))}
        {tab === "pending" && (rows?.length ?? 0) > 1 && (
          <button type="button" onClick={approveAll} disabled={!!working}
            className={`${btn} ml-auto mb-1 border border-slate-300 text-slate-700 hover:bg-slate-50`}>
            Approve all
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {rows === null ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            {tab === "pending" ? "Nothing waiting. New Google reviews will appear here." : tab === "published" ? "No reviews shown yet." : "Nothing hidden."}
          </p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start gap-3">
                {r.authorPhotoUrl ? (
                  <img src={r.authorPhotoUrl} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
                    {r.authorName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800">{r.authorName}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <Stars value={r.rating} />
                    <span>{r.reviewedOn}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold capitalize text-slate-500">{r.source}</span>
                    {r.tourTitle && <span>· {r.tourTitle}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {tab !== "published" && (
                    <button type="button" disabled={working === r.id} onClick={() => decide(r.id, "approve")}
                      className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
                      {tab === "hidden" ? "Show" : "Approve"}
                    </button>
                  )}
                  {tab !== "hidden" && (
                    <button type="button" disabled={working === r.id} onClick={() => decide(r.id, "hide")}
                      className={`${btn} border border-slate-300 text-slate-600 hover:bg-slate-50`}>
                      Hide
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{r.body}</p>
            </div>
          ))
        )}
      </div>
    </>
  );
}

/**
 * New reviews, on the dashboard: the ones waiting for a decision, with the
 * decision one click away, so a review does not sit unseen until someone
 * happens to open the Reviews screen.
 */
export function ReviewsWaiting() {
  const [rows, setRows] = useState<AdminReview[] | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    api<{ reviews: AdminReview[] }>("/reviews?status=pending").then((r) => setRows(r.reviews)).catch(() => setRows([]));
  }, []);

  const decide = async (id: string, action: "approve" | "hide") => {
    setWorking(id);
    try {
      await api(`/reviews/${id}/${action}`, { method: "POST" });
      setRows((r) => r?.filter((x) => x.id !== id) ?? r);
    } finally {
      setWorking(null);
    }
  };

  const count = rows?.length ?? 0;
  return (
    <section className="rounded-2xl border bg-white p-5" style={{ borderColor: count ? "#f59e0b" : "#e2e8f0" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">
          New reviews
          {count > 0 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{count} waiting</span>}
        </h2>
        <Link href="/admin/reviews" className="text-xs text-cyan-600 no-underline hover:underline">All reviews →</Link>
      </div>
      {rows === null ? (
        <p className="py-4 text-sm text-slate-400">Loading…</p>
      ) : count === 0 ? (
        <p className="py-4 text-sm text-slate-400">No new reviews waiting for approval.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.slice(0, 5).map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-slate-700">{r.authorName}</span>
                  <Stars value={r.rating} />
                  <span className="text-xs text-slate-400">{r.reviewedOn}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{r.body}</p>
              </div>
              <div className="flex shrink-0 gap-3 pt-0.5">
                <button type="button" disabled={working === r.id} onClick={() => decide(r.id, "approve")}
                  className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-50">Approve</button>
                <button type="button" disabled={working === r.id} onClick={() => decide(r.id, "hide")}
                  className="text-xs font-semibold text-slate-500 hover:underline disabled:opacity-50">Hide</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {count > 5 && (
        <Link href="/admin/reviews" className="mt-2 block text-xs text-cyan-600 no-underline hover:underline">
          and {count - 5} more →
        </Link>
      )}
    </section>
  );
}
