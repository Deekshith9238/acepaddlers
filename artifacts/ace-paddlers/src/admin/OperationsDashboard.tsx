import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetOperations, useListBookings, useSearchBookings, type BookingDetail } from "@workspace/api-client-react";
import { formatINR } from "@/lib/content";
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
          {view === "week" && <WeekView from={range.from} departures={departures} />}
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

/** The admin's own calendar day, not UTC's: before 5:30 am in India the two differ. */
const localToday = () => new Date().toLocaleDateString("en-CA");

/** Guests travelling and bookings made, over one day's departures. */
const daySummary = (deps: any[]) => ({
  guests: deps.reduce((n, x) => n + (x.guests ?? 0), 0),
  booked: deps.reduce((n, x) => n + (x.bookings ?? 0), 0),
});

/**
 * The day picked within a window. A new window starts on today when it holds
 * today, else on its first day.
 */
function usePickedDay(from: Date, to: Date): [string, (d: string) => void] {
  const [picked, setPicked] = useState<string | null>(null);
  const today = localToday();
  const [a, b] = [iso(from), iso(to)];
  const day = picked && picked >= a && picked <= b ? picked : today >= a && today <= b ? today : a;
  return [day, setPicked];
}

/**
 * The week as seven days to pick from, then the chosen day's timings and
 * bookings — the monthly view's flow over a week. The trip-by-day seat grid
 * stays underneath, folded away.
 */
function WeekView({ from, departures }: { from: Date; departures: any[] }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const [selected, setPicked] = usePickedDay(days[0], days[6]);
  const today = localToday();
  const byDate = new Map<string, any[]>();
  for (const d of departures) byDate.set(d.date, [...(byDate.get(d.date) ?? []), d]);

  return (
    <>
      {/* Seven cards are too narrow on a phone, so the strip scrolls there. */}
      <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-1.5 min-w-[40rem]">
        {days.map((d) => {
          const key = iso(d);
          const { guests, booked } = daySummary(byDate.get(key) ?? []);
          const isSel = key === selected;
          return (
            <button key={key} type="button" onClick={() => setPicked(key)}
              className={`rounded-xl border px-2 py-2 text-left transition-colors ${
                isSel ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-200 bg-white hover:border-cyan-400 hover:bg-cyan-50"
              }`}>
              <div className={`text-[11px] font-semibold uppercase tracking-wide ${isSel ? "text-cyan-50" : "text-slate-400"}`}>
                {d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}
                {key === today && " · today"}
              </div>
              <div className={`text-lg font-semibold leading-tight ${isSel ? "text-white" : "text-slate-800"}`}>
                {d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}
              </div>
              <div className={`mt-1 text-[11px] tabular-nums ${isSel ? "text-cyan-50" : guests > 0 ? "font-semibold text-cyan-800" : "text-slate-400"}`}>
                {guests > 0 ? `${guests} ${guests === 1 ? "guest" : "guests"} · ${booked} ${booked === 1 ? "booking" : "bookings"}` : "No bookings"}
              </div>
            </button>
          );
        })}
      </div>
      </div>
      <div className="mt-5">
        <DayPanel key={selected} date={selected} departures={byDate.get(selected) ?? []} />
      </div>
      <details className="mt-6">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">Seats by trip, all week</summary>
        <div className="mt-3"><WeekGrid from={from} departures={departures} /></div>
      </details>
    </>
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

/**
 * The month as a calendar to pick a day from, then that day's timings, then
 * the bookings on them: the order the crew asks the questions in. Each day
 * shows how many people are travelling, so the busy days stand out.
 */
function MonthGrid({ from, to, departures }: { from: Date; to: Date; departures: any[] }) {
  const byDate = new Map<string, any[]>();
  for (const d of departures) byDate.set(d.date, [...(byDate.get(d.date) ?? []), d]);

  const today = localToday();
  const [selected, setPicked] = usePickedDay(from, to);

  const lead = (from.getUTCDay() + 6) % 7;
  const cells: (Date | null)[] = Array(lead).fill(null);
  for (let i = 1; i <= to.getUTCDate(); i += 1) cells.push(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), i)));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="grid grid-cols-7 self-start border-t border-l border-slate-200 text-sm">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
          <div key={w} className="border-r border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="border-r border-b border-slate-200 min-h-[4.5rem] bg-slate-50/40" />;
          const key = iso(d);
          const deps = byDate.get(key) ?? [];
          const { guests, booked } = daySummary(deps);
          const isSel = key === selected;
          return (
            <button key={i} type="button" onClick={() => setPicked(key)}
              className={`border-r border-b border-slate-200 min-h-[4.5rem] p-1.5 text-left align-top transition-colors ${
                isSel ? "bg-cyan-600 text-white" : "bg-white hover:bg-cyan-50"
              }`}>
              <div className={`text-xs font-semibold ${isSel ? "text-white" : key === today ? "text-cyan-700" : "text-slate-500"}`}>
                {d.getUTCDate()}{key === today && !isSel ? " · today" : ""}
              </div>
              {guests > 0 && (
                <div className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${isSel ? "bg-white/20 text-white" : "bg-cyan-50 text-cyan-800"}`}>
                  {guests} {guests === 1 ? "guest" : "guests"}
                </div>
              )}
              {booked > 0 && (
                <div className={`mt-0.5 text-[11px] ${isSel ? "text-cyan-50" : "text-slate-400"}`}>
                  {booked} {booked === 1 ? "booking" : "bookings"}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <DayPanel key={selected} date={selected} departures={byDate.get(selected) ?? []} />
    </div>
  );
}

/** One day: its timings to choose from, and the bookings on the chosen one. */
function DayPanel({ date, departures }: { date: string; departures: any[] }) {
  const [, navigate] = useLocation();
  const [slotId, setSlotId] = useState<string | null>(null);
  // Trips that run every half hour put dozens of empty timings on a day; the
  // ones people are booked on are what the crew needs first.
  const [showAll, setShowAll] = useState(false);
  const booked = departures.filter((d) => d.bookings > 0);
  const timings = showAll ? departures : booked;
  const { data, isLoading } = useListBookings({ departsFrom: date, departsTo: date });
  const all = (Array.isArray(data) ? data : []) as BookingDetail[];
  const shown = (slotId ? all.filter((b) => b.slotId === slotId) : all)
    .slice()
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.customerName.localeCompare(b.customerName));
  const travelling = shown.filter((b) => b.status !== "cancelled").reduce((n, b) => n + b.numGuests, 0);

  const pill = (on: boolean) =>
    `rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${on ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-cyan-400"}`;

  return (
    <div className="min-w-0">
      <h3 className="text-base font-semibold text-slate-800">{dayLabel(new Date(`${date}T00:00:00Z`))}</h3>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timings</div>
        {departures.length > booked.length && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs font-semibold text-cyan-700 hover:underline">
            {showAll ? "Only timings with bookings" : `Show all ${departures.length} timings`}
          </button>
        )}
      </div>
      {departures.length === 0 ? (
        <p className="mt-1 text-sm text-slate-400">No departures on this day.</p>
      ) : timings.length === 0 ? (
        <p className="mt-1 text-sm text-slate-400">Nobody is booked on this day's timings.</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button type="button" className={pill(slotId === null)} onClick={() => setSlotId(null)}>
            <span className="font-semibold">All</span>
          </button>
          {timings.map((d) => (
            <button key={d.slotId} type="button" className={pill(slotId === d.slotId)} onClick={() => setSlotId(d.slotId)}
              title={`${d.tourTitle}${d.variantLabel ? ` · ${d.variantLabel}` : ""}`}>
              <span className="font-semibold tabular-nums">{d.startTime}</span>
              <span className="ml-1.5 tabular-nums opacity-80">{d.guests} {d.guests === 1 ? "guest" : "guests"}</span>
              <span className="block max-w-[10rem] truncate opacity-80">{d.tourCode ?? d.tourTitle}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bookings</div>
        {shown.length > 0 && <div className="text-xs text-slate-500">{shown.length} · {travelling} travelling</div>}
      </div>
      {isLoading ? (
        <p className="mt-1 text-sm text-slate-400">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="mt-1 text-sm text-slate-400">No bookings{slotId ? " on this timing" : " on this day"}.</p>
      ) : (
        <ul className="mt-1.5 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {shown.map((b) => (
            <li key={b.id}>
              <button type="button" onClick={() => navigate(`/admin/bookings/${b.id}`)}
                className={`block w-full px-3 py-2.5 text-left hover:bg-slate-50 ${b.status === "cancelled" ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-800">{b.customerName}</span>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  <span className="tabular-nums font-semibold">{b.startTime ?? "—"}</span>
                  {" · "}{b.numGuests} {b.numGuests === 1 ? "guest" : "guests"}
                  {" · "}<span className="font-mono">{b.bookingRef}</span>
                  {!slotId && <> · {b.tourCode ?? b.tourTitle}</>}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {b.customerPhone}
                  {b.status === "cancelled" ? null
                    : b.amountDue > 0 ? <span className="ml-2 font-semibold text-amber-700">Due {formatINR(b.amountDue)}</span>
                    : <span className="ml-2 text-emerald-700">Paid</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
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
