import { Link } from "wouter";
import { useGetTourOverview } from "@workspace/api-client-react";
import { Card, rupees } from "./shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Six months of departures as a heat-map, one column per day. */
function HeatMap({ departures }: { departures: { date: string; capacity: number; booked: number }[] }) {
  if (departures.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No departures scheduled.{" "}
        <Link href="/admin/availability" className="text-cyan-700 font-semibold">Generate slots</Link> to open the calendar.
      </p>
    );
  }
  const byMonth = new Map<string, { date: string; capacity: number; booked: number }[]>();
  for (const d of departures) {
    const m = d.date.slice(0, 7);
    byMonth.set(m, [...(byMonth.get(m) ?? []), d]);
  }
  return (
    <div className="space-y-1.5 overflow-x-auto">
      {[...byMonth.entries()].map(([month, days]) => (
        <div key={month} className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-xs text-cyan-700 font-semibold">
            {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })}
          </span>
          <div className="flex gap-[3px]">
            {days.map((d) => {
              const ratio = d.capacity > 0 ? d.booked / d.capacity : 0;
              // Empty days stay near-white so a busy day reads at a glance.
              const bg = ratio === 0 ? "#f8fafc" : ratio >= 1 ? "#dc2626" : `rgba(6,182,212,${0.18 + ratio * 0.72})`;
              return (
                <span
                  key={d.date}
                  title={`${d.date} — ${d.booked}/${d.capacity} seats`}
                  className="inline-block w-3.5 h-5 rounded-[2px] border border-slate-200"
                  style={{ background: bg }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm text-slate-700 mt-0.5">{value}</div>
    </div>
  );
}

export function TripOverview({ tourId }: { tourId: string }) {
  const { data } = useGetTourOverview(tourId);
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;

  const s = data.settings;

  return (
    <>
      <Card title="Departure calendar" hint="The next six months. Darker means fuller; red is sold out." right={<Link href={`/admin/tours/${tourId}/calendar`} className="text-sm text-cyan-700 font-semibold no-underline">Edit →</Link>}>
        <HeatMap departures={data.departures ?? []} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Rates" hint="What each kind of guest pays per head." right={<Link href={`/admin/tours/${tourId}/prices`} className="text-sm text-cyan-700 font-semibold no-underline">Edit →</Link>}>
          <div className="space-y-2">
            {(data.rates ?? []).map((r: any, i: number) => (
              <div key={i} className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
                <span className="text-sm text-slate-700">
                  {r.label}
                  {r.variant && <span className="text-slate-400"> · {r.variant}</span>}
                </span>
                <span className="text-sm font-semibold text-slate-800 tabular-nums">{rupees(r.price)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Settings" right={<Link href={`/admin/tours/${tourId}/settings`} className="text-sm text-cyan-700 font-semibold no-underline">Edit →</Link>}>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Minimum participants" value={s.minParticipants ?? "No minimum"} />
            <Stat label="Maximum participants" value={s.maxParticipants ?? "No maximum"} />
            <Stat
              label="Booking lead time"
              value={s.bookingLeadTimeHours > 0 ? `Closes ${s.bookingLeadTimeHours}h before departure` : "Bookable until the last moment"}
            />
            <Stat
              label="Deposit"
              value={s.allowPartialDeposit ? `${s.depositPercent}% of the total` : "Full amount"}
            />
            <Stat label="Mode" value={s.bookingMode === "enquiry" ? "Enquiry — team confirms" : "Direct — pays online"} />
            <Stat label="Status" value={<span className="capitalize">{data.status}</span>} />
          </div>
        </Card>
      </div>

      {(data.variants ?? []).length > 0 && (
        <Card title="Variants" hint="Ways of doing this trip, sharing one calendar." right={<Link href={`/admin/tours/${tourId}/prices`} className="text-sm text-cyan-700 font-semibold no-underline">Edit →</Link>}>
          <div className="flex flex-wrap gap-2">
            {data.variants.map((v: any) => (
              <span key={v.id} className={`rounded-full px-3 py-1 text-xs font-semibold ${v.active ? "bg-cyan-50 text-cyan-800" : "bg-slate-100 text-slate-400"}`}>
                {v.code} · {v.label}
                {!v.active && " (off)"}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card title="Your trip page" hint="Where this trip lives on the public site.">
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-slate-500 w-28 shrink-0">Trip page →</span>
            <a href={data.tourUrl} target="_blank" rel="noreferrer" className="text-cyan-700 break-all">{data.tourUrl}</a>
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-slate-500 w-28 shrink-0">Booking form →</span>
            <a href={data.bookingUrl} target="_blank" rel="noreferrer" className="text-cyan-700 break-all">{data.bookingUrl}</a>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Trip code" value={data.code ?? "—"} />
          <Stat label="Bookings" value={data.counts.bookings} />
          <Stat label="Add-ons" value={data.counts.addons} />
          <Stat label="Extra fields" value={data.counts.bookingFields} />
        </div>
      </Card>
    </>
  );
}
