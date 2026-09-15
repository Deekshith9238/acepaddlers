import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useGetTourCalendar, useOverrideTourSlot } from "@workspace/api-client-react";
import { Card, inputCls, labelCls, ghostBtnCls } from "./shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Colours for the variant legend, in the order variants are listed. */
const DOTS = ["#2563eb", "#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#ef4444"];

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Days of a month laid out Monday-first, padded with the leading blanks the
 * grid needs. Built in UTC so a machine in another timezone can't shift a date.
 */
function monthGrid(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // getUTCDay() is Sunday-first; shift so Monday is column 0.
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d += 1) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function TripCalendar({ tourId }: { tourId: string }) {
  const [month, setMonth] = useState(thisMonth());
  const { data, refetch, isLoading } = useGetTourCalendar(tourId, month);
  const override = useOverrideTourSlot();
  const [editing, setEditing] = useState<string | null>(null);
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const variants = data?.variants ?? [];
  const colour = useMemo(() => {
    const m = new Map<string, string>();
    variants.forEach((v, i) => m.set(v.id, DOTS[i % DOTS.length]));
    return m;
  }, [variants]);

  const byDate = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const s of data?.slots ?? []) {
      const list = m.get(s.date) ?? [];
      list.push(s);
      m.set(s.date, list);
    }
    return m;
  }, [data]);

  const cells = monthGrid(month);
  const slot = (data?.slots ?? []).find((s) => s.id === editing);

  const saveOverride = (status?: "open" | "closed") => {
    if (!slot) return;
    setError(null);
    override.mutate(
      {
        slotId: slot.id,
        data: {
          ...(status ? { status } : { capacity: Number(capacity) }),
        } as any,
      },
      {
        onSuccess: () => { setEditing(null); refetch(); },
        onError: (err: any) =>
          setError(
            err?.data?.error === "below_booked"
              ? `${err.data.bookedCount} seats are already booked on this departure.`
              : "Couldn't update this departure.",
          ),
      },
    );
  };

  return (
    <>
      <Card
        title="Departures"
        hint="Every departure generated for this trip. Click a day to change its capacity or close it — the recurring rules are edited under Bookings → Departures."
        right={
          <div className="flex items-center gap-2">
            <button type="button" className={ghostBtnCls} onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
            <span className="text-sm font-semibold text-slate-700 min-w-[9rem] text-center">{monthLabel(month)}</span>
            <button type="button" className={ghostBtnCls} onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
          </div>
        }>
        <div className="grid grid-cols-7 border-t border-l border-slate-200 text-sm">
          {WEEKDAYS.map((d) => (
            <div key={d} className="border-r border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {d}
            </div>
          ))}
          {cells.map((date, i) => {
            const slots = date ? (byDate.get(date) ?? []) : [];
            return (
              <div key={i} className="border-r border-b border-slate-200 min-h-[5.5rem] p-1.5 align-top">
                {date && <div className="text-xs text-slate-400 mb-1">{Number(date.slice(-2))}</div>}
                <div className="space-y-1">
                  {slots.map((s: any) => {
                    const full = s.bookedCount >= s.capacity;
                    const closed = s.status !== "open";
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setEditing(s.id); setCapacity(String(s.capacity)); setError(null); }}
                        className={`w-full flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-left ${
                          closed ? "bg-slate-100 text-slate-400 line-through" : full ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-600 hover:bg-cyan-50"
                        }`}>
                        <span
                          className={`inline-block w-2 h-2 rounded-full shrink-0 ${s.overridden ? "ring-1 ring-slate-500 bg-transparent" : ""}`}
                          style={s.overridden ? undefined : { background: s.variantId ? colour.get(s.variantId) : "#64748b" }}
                        />
                        <span className="tabular-nums">{s.startTime}</span>
                        <span className="ml-auto tabular-nums">{s.bookedCount}/{s.capacity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          {variants.map((v) => (
            <span key={v.id} className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colour.get(v.id) }} />
              {v.label}
            </span>
          ))}
          {variants.length === 0 && (
            <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-500" /> All bookings</span>
          )}
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-slate-500" /> Overridden</span>
        </div>

        {isLoading && <p className="text-sm text-slate-400 mt-3">Loading…</p>}
        {!isLoading && (data?.slots ?? []).length === 0 && (
          <p className="text-sm text-slate-400 mt-4">
            No departures this month.{" "}
            <Link href="/admin/availability" className="text-cyan-700 font-semibold">Generate slots</Link> to open the calendar.
          </p>
        )}
      </Card>

      {slot && (
        <Card title={`${slot.date} at ${slot.startTime}`} hint={`${slot.bookedCount} of ${slot.capacity} seats sold.`}>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className={labelCls}>Capacity</label>
              <input type="number" min={0} className={`${inputCls} max-w-[8rem]`} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
            <button type="button" onClick={() => saveOverride()} disabled={override.isPending} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
              {override.isPending ? "Saving…" : "Set capacity"}
            </button>
            <button type="button" onClick={() => saveOverride(slot.status === "open" ? "closed" : "open")} className={ghostBtnCls}>
              {slot.status === "open" ? "Close this departure" : "Reopen"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="text-sm text-slate-500 hover:underline ml-auto">Cancel</button>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </Card>
      )}
    </>
  );
}
