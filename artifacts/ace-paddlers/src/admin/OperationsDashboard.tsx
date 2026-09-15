import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetOperations, useSearchBookings } from "@workspace/api-client-react";
import { StatusBadge } from "@/admin/booking/sections";

/* eslint-disable @typescript-eslint/no-explicit-any */

type View = "week" | "month" | "list";

const inputCls =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Monday of the week containing `d`, in UTC so the grid never shifts by zone. */
function startOfWeek(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
}
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
const startOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const endOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));

const dayLabel = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });
const monthLabel = (d: Date) => d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * The operations dashboard: what is running, and who is on it.
 *
 * Three windows onto the same question, matching the console the team is
 * migrating from — a week at a glance with one row per trip, a month grid, and
 * a flat list for reading down. The range drives one request; the grouping is
 * done here.
 */
export default function OperationsDashboard() {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [, navigate] = useLocation();

  const range = useMemo(() => {
    if (view === "month") return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    if (view === "week") {
      const s = startOfWeek(anchor);
      return { from: s, to: addDays(s, 6) };
    }
    // The list is a forward-looking work queue, not a window you page through.
    const today = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
    return { from: today, to: addDays(today, 30) };
  }, [view, anchor]);

  const { data, refetch, isFetching } = useGetOperations({ from: iso(range.from), to: iso(range.to) });
  const departures = (data?.departures ?? []) as any[];

  const step = (dir: number) =>
    setAnchor((a) => {
      const x = new Date(a);
      if (view === "month") x.setUTCMonth(x.getUTCMonth() + dir);
      else x.setUTCDate(x.getUTCDate() + dir * (view === "week" ? 7 : 30));
      return x;
    });

  const title =
    view === "month"
      ? monthLabel(range.from)
      : `${range.from.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" })} – ${range.to.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" })}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <BookingSearch onPick={(id) => navigate(`/admin/bookings/${id}`)} />
          <Link href="/admin/enquiries" className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-slate-800">
            + New inquiry
          </Link>
          <Link href="/admin/bookings" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-emerald-700">
            + New booking
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-200">
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
            {(["list", "month", "week"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize ${
                  view === v ? "bg-cyan-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}>
                {v === "list" ? "List view" : v === "month" ? "Monthly calendar" : "Weekly calendar"}
              </button>
            ))}
          </div>
          <span className="flex-1" />
          {view !== "list" && (
            <>
              <button type="button" onClick={() => step(-1)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">‹</button>
              <span className="text-sm font-semibold text-slate-700 min-w-[10rem] text-center">{title}</span>
              <button type="button" onClick={() => step(1)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">›</button>
            </>
          )}
          {view === "list" && <span className="text-sm font-semibold text-slate-700">Next 30 days</span>}
          <button type="button" onClick={() => refetch()} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            {isFetching ? "…" : "↻"}
          </button>
          <button type="button" onClick={() => setAnchor(new Date())} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Today
          </button>
        </div>

        <div className="p-5">
          {view === "week" && <WeekGrid from={range.from} departures={departures} />}
          {view === "month" && <MonthGrid from={range.from} to={range.to} departures={departures} />}
          {view === "list" && <ListView departures={departures} />}
        </div>
      </div>
    </>
  );
}

/** How full a departure is, coloured the same way everywhere. */
function fillTone(d: any): string {
  if (d.status !== "open") return "bg-slate-100 text-slate-400 line-through";
  if (d.bookedCount >= d.capacity) return "bg-red-50 text-red-700";
  if (d.bookedCount > 0) return "bg-cyan-50 text-cyan-800";
  return "bg-slate-50 text-slate-500";
}

function Chip({ d }: { d: any }) {
  return (
    <Link
      href={`/admin/tours/${d.tourId}/calendar`}
      className={`block rounded px-1.5 py-0.5 text-[11px] no-underline ${fillTone(d)}`}
      title={`${d.tourTitle}${d.variantLabel ? ` · ${d.variantLabel}` : ""} — ${d.guests} travelling, ${d.bookedCount}/${d.capacity} seats`}>
      <span className="tabular-nums font-semibold">{d.startTime}</span>{" "}
      <span className="tabular-nums">{d.bookedCount}/{d.capacity}</span>
    </Link>
  );
}

/** One row per trip, one column per day — VL's weekly view. */
function WeekGrid({ from, departures }: { from: Date; departures: any[] }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const byTour = new Map<string, { title: string; code: string | null; byDate: Map<string, any[]> }>();
  for (const d of departures) {
    const key = `${d.tourId}|${d.variantLabel ?? ""}`;
    const row = byTour.get(key) ?? {
      title: d.variantLabel ? `${d.tourTitle} · ${d.variantLabel}` : d.tourTitle,
      code: d.tourCode,
      byDate: new Map<string, any[]>(),
    };
    row.byDate.set(d.date, [...(row.byDate.get(d.date) ?? []), d]);
    byTour.set(key, row);
  }

  if (byTour.size === 0) return <Empty />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-l border-t border-slate-200 text-sm min-w-[52rem]">
        <thead>
          <tr>
            <th className="border-r border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-56">
              Trip name
            </th>
            {days.map((d) => (
              <th key={iso(d)} className="border-r border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-semibold text-slate-500">
                {dayLabel(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...byTour.entries()].map(([key, row]) => (
            <tr key={key}>
              <td className="border-r border-b border-slate-200 px-3 py-2 align-top">
                {row.code && <span className="mr-1 text-xs font-bold text-red-700">{row.code}</span>}
                <span className="text-slate-700">{row.title}</span>
              </td>
              {days.map((d) => (
                <td key={iso(d)} className="border-r border-b border-slate-200 px-1.5 py-1.5 align-top min-w-[6rem]">
                  <div className="space-y-1">
                    {(row.byDate.get(iso(d)) ?? []).map((x) => <Chip key={x.slotId} d={x} />)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthGrid({ from, to, departures }: { from: Date; to: Date; departures: any[] }) {
  const byDate = new Map<string, any[]>();
  for (const d of departures) byDate.set(d.date, [...(byDate.get(d.date) ?? []), d]);

  const lead = (from.getUTCDay() + 6) % 7;
  const cells: (Date | null)[] = Array(lead).fill(null);
  for (let i = 1; i <= to.getUTCDate(); i += 1) cells.push(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), i)));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="grid grid-cols-7 border-t border-l border-slate-200 text-sm">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
        <div key={w} className="border-r border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {w}
        </div>
      ))}
      {cells.map((d, i) => (
        <div key={i} className="border-r border-b border-slate-200 min-h-[6rem] p-1.5 align-top">
          {d && <div className="text-xs text-slate-400 mb-1">{d.getUTCDate()}</div>}
          <div className="space-y-1">
            {d && (byDate.get(iso(d)) ?? []).map((x) => (
              <Chip key={x.slotId} d={x} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ departures }: { departures: any[] }) {
  if (departures.length === 0) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr className="border-b border-slate-200">
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Time</th>
            <th className="py-2 pr-4">Trip</th>
            <th className="py-2 pr-4 text-right">Travelling</th>
            <th className="py-2 pr-4 text-right">Seats</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {departures.map((d) => (
            <tr key={d.slotId} className="border-b border-slate-50">
              <td className="py-2 pr-4 text-slate-700 whitespace-nowrap">{dayLabel(new Date(`${d.date}T00:00:00Z`))}</td>
              <td className="py-2 pr-4 text-slate-600 tabular-nums">{d.startTime}</td>
              <td className="py-2 pr-4">
                {d.tourCode && <span className="mr-1 text-xs font-bold text-red-700">{d.tourCode}</span>}
                <Link href={`/admin/tours/${d.tourId}/calendar`} className="text-cyan-700 no-underline hover:underline">{d.tourTitle}</Link>
                {d.variantLabel && <span className="text-slate-400"> · {d.variantLabel}</span>}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums text-slate-700">{d.guests}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-slate-500">{d.bookedCount}/{d.capacity}</td>
              <td className="py-2">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${d.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {d.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return (
    <p className="text-sm text-slate-400 py-6 text-center">
      No departures here. <Link href="/admin/availability" className="text-cyan-700 font-semibold">Generate some</Link>.
    </p>
  );
}

/** VL's header search: a booking ID, or any passenger's name, email or phone. */
function BookingSearch({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const { data } = useSearchBookings({ q }, { query: { enabled: q.trim().length >= 2 } } as never);
  const hits = (data ?? []) as any[];

  return (
    <div className="relative">
      <input
        className={`${inputCls} w-72`}
        placeholder="Search by booking ID or any passenger…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q.trim().length >= 2 && (
        <div className="absolute right-0 z-20 mt-1 w-96 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">No booking matches “{q}”.</p>
          ) : (
            hits.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => { setQ(""); onPick(h.id); }}
                className="block w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">{h.customerName}</span>
                  <StatusBadge status={h.status} />
                </div>
                <div className="text-xs text-slate-500 font-mono">{h.bookingRef}</div>
                <div className="text-xs text-slate-400">
                  {h.tourTitle ?? "—"}{h.date ? ` · ${h.date}` : ""} · {h.numGuests} guest{h.numGuests === 1 ? "" : "s"}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
