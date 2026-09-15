import { useMemo, useState } from "react";
import { useGetAnalytics } from "@workspace/api-client-react";

function isoDaysAgo(n: number): string {
  const d = new Date(Date.now() + 5.5 * 3600e3);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function rupees(n: number): string {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

/** Percentage change against the previous equal-length period. Returns null
 *  when there's no baseline — "+100%" from zero is noise, not information. */
function delta(now: number, before: number): number | null {
  if (before === 0) return null;
  return Math.round(((now - before) / before) * 100);
}

function Stat({ label, value, prev, money }: { label: string; value: number; prev: number; money?: boolean }) {
  const d = delta(value, prev);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-800 tabular-nums">
        {money ? rupees(value) : value.toLocaleString("en-IN")}
      </div>
      {d === null ? (
        <div className="mt-1 text-xs text-slate-400">no prior data</div>
      ) : (
        <div className={`mt-1 text-xs font-medium ${d >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {d >= 0 ? "▲" : "▼"} {Math.abs(d)}% vs previous period
        </div>
      )}
    </div>
  );
}

/** Inline sparkline. An SVG polyline is enough here and keeps the admin bundle
 *  free of a charting library. */
function Trend({ points }: { points: { date: string; pageviews: number; visitors: number; bookings: number }[] }) {
  if (points.length < 2) return <p className="text-sm text-slate-400">Not enough data to chart yet.</p>;
  const w = 720;
  const h = 120;
  const max = Math.max(1, ...points.map((p) => p.pageviews));
  const step = w / (points.length - 1);
  const line = points.map((p, i) => `${i * step},${h - (p.pageviews / max) * h}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" preserveAspectRatio="none" role="img" aria-label="Pageviews trend">
        <polygon points={area} fill="#0891b2" opacity="0.12" />
        <polyline points={line} fill="none" stroke="#0891b2" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>{points[0].date}</span>
        <span>peak {max} views/day</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <h2 className="px-5 py-3 text-sm font-semibold text-slate-800 border-b border-slate-100">{title}</h2>
      {children}
    </div>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <p className="px-5 py-8 text-center text-sm text-slate-400">Nothing recorded yet.</p>;
  return (
    <table className="w-full">
      <thead className="bg-slate-50 text-left">
        <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {head.map((h, i) => <th key={h} className={`px-4 py-2 ${i > 0 ? "text-right" : ""}`}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-slate-100">
            {r.map((c, j) => (
              <td key={j} className={`px-4 py-2 text-sm text-slate-700 ${j > 0 ? "text-right tabular-nums" : "truncate max-w-xs"}`}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Inner() {
  const [range, setRange] = useState({ from: isoDaysAgo(29), to: isoDaysAgo(0) });
  const { data, isLoading } = useGetAnalytics(range);

  const empty = useMemo(() => !!data && data.totals.pageviews === 0 && data.totals.bookings === 0, [data]);

  if (isLoading || !data) return <p className="text-slate-400 text-sm">Loading…</p>;

  const t = data.totals;
  const p = data.previous;
  const bookingConversion = t.bookingsStarted > 0 ? Math.round((t.bookings / t.bookingsStarted) * 1000) / 10 : 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            First-party, cookie-free traffic and conversion for {data.range.from} → {data.range.to}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data.liveVisitors > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {data.liveVisitors} on the site now
            </span>
          )}
          {[
            { label: "7d", days: 6 },
            { label: "30d", days: 29 },
            { label: "90d", days: 89 },
          ].map((r) => (
            <button key={r.label} type="button"
              onClick={() => setRange({ from: isoDaysAgo(r.days), to: isoDaysAgo(0) })}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white">
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {empty && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-6">
          <p className="text-sm text-amber-900">
            No traffic recorded in this window yet. Tracking starts the moment the site is deployed with this build —
            historic visits from before then can't be backfilled.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <Stat label="Pageviews" value={t.pageviews} prev={p.pageviews} />
        <Stat label="Visitors" value={t.visitors} prev={p.visitors} />
        <Stat label="Booking forms opened" value={t.bookingsStarted} prev={p.bookingsStarted} />
        <Stat label="Bookings" value={t.bookings} prev={p.bookings} />
        <Stat label="Enquiries" value={t.enquiries} prev={p.enquiries} />
        <Stat label="Booking value" value={t.revenue} prev={p.revenue} money />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800">Traffic</h2>
          <span className="text-xs text-slate-500">
            {bookingConversion}% of opened booking forms became bookings
          </span>
        </div>
        <Trend points={data.trend} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top trips — views to bookings">
          <SimpleTable
            head={["Tour", "Viewers", "Bookings", "Conversion"]}
            rows={data.topTours.map((r) => [r.title, r.views, r.bookings, `${r.conversion}%`])}
          />
        </Panel>
        <Panel title="Traffic sources">
          <SimpleTable
            head={["Source / medium", "Visitors", "Bookings"]}
            rows={data.sources.map((r) => [`${r.source} / ${r.medium}`, r.visitors, r.bookings])}
          />
        </Panel>
        <Panel title="Top pages">
          <SimpleTable head={["Path", "Views", "Visitors"]} rows={data.topPages.map((r) => [r.path, r.pageviews, r.visitors])} />
        </Panel>
        <Panel title="Referrers">
          <SimpleTable head={["Referrer", "Visitors"]} rows={data.referrers.map((r) => [r.referrer, r.visitors])} />
        </Panel>
        {data.campaigns.length > 0 && (
          <Panel title="Campaigns">
            <SimpleTable head={["Campaign", "Visitors", "Bookings"]} rows={data.campaigns.map((r) => [r.campaign, r.visitors, r.bookings])} />
          </Panel>
        )}
      </div>
    </>
  );
}

export default function AdminAnalytics() {
  return (
    <Inner />
  );
}
