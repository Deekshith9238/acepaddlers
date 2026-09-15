import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useListBookings, type BookingDetail } from "@workspace/api-client-react";
import { StatusBadge, Pill, rupees, fmtDateTime, fmtDate } from "@/admin/booking/sections";
import BookingFilters, {
  EMPTY_FILTERS,
  activeFilterCount,
  type BookingFilterState,
} from "@/admin/booking/BookingFilters";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * One row of the booking list, in Vacation Labs' four columns: what was booked,
 * who booked it, when they travel, and where it stands.
 *
 * The row is a link, not an accordion. Editing happens on the booking's own
 * page, where each part of the record is changed on its own — expanding a whole
 * edit form inside a list made it far too easy to alter a booking you only
 * meant to glance at.
 */
function BookingRow({ b }: { b: BookingDetail }) {
  const [, navigate] = useLocation();
  return (
    <tr
      onClick={() => navigate(`/admin/bookings/${b.id}`)}
      className="border-t border-slate-100 hover:bg-cyan-50/40 cursor-pointer">
      <td className="px-4 py-3 align-top">
        <div className="text-sm">
          {b.tourCode && <span className="font-semibold text-red-700 mr-1.5">{b.tourCode}</span>}
          <span className="text-cyan-700 font-medium">{b.tourTitle ?? "—"}</span>
        </div>
        <div className="text-xs text-slate-400 font-mono mt-0.5">#{b.bookingRef}</div>
        {b.variantLabel && <div className="text-xs text-slate-500 mt-0.5">{b.variantLabel}</div>}
        <div className="text-xs text-slate-400 mt-0.5">{fmtDateTime(b.createdAt)}</div>
      </td>
      <td className="px-4 py-3 align-top text-sm">
        <div className="font-medium text-slate-800">{b.customerName}</div>
        <div className="text-xs text-slate-500 break-words">{b.customerEmail}</div>
        <div className="text-xs text-slate-500">{b.customerPhone}</div>
      </td>
      <td className="px-4 py-3 align-top text-sm text-slate-700">
        <div>{b.date ? `${fmtDate(b.date)}${b.startTime ? `, ${b.startTime}` : ""}` : "—"}</div>
        <div className="text-xs text-slate-500 mt-0.5">👤 {b.numGuests} passenger{b.numGuests === 1 ? "" : "s"}</div>
        <div className="text-xs text-slate-500 mt-0.5">{rupees(b.totalAmount, b.currency)}</div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={b.status} />
          {b.amountDue > 0 && b.status !== "cancelled" && <Pill tone="warn">{rupees(b.amountDue, b.currency)} balance</Pill>}
          {b.paymentStatus === "refunded" && <Pill tone="info">Refunded</Pill>}
          {(b.tags ?? []).map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{t}</span>
          ))}
        </div>
      </td>
    </tr>
  );
}

function Inner() {
  const [filters, setFilters] = useState<BookingFilterState>(EMPTY_FILTERS);
  const set = (patch: Partial<BookingFilterState>) => setFilters((f) => ({ ...f, ...patch }));

  // Blank fields are dropped rather than sent as empty strings, so the server
  // never has to distinguish "unset" from "match the empty string".
  const params = useMemo(() => {
    const p: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v === "" || v === false) continue;
      p[k] = v as string | boolean;
    }
    return p;
  }, [filters]);

  const { data, isLoading } = useListBookings(params);
  const rows: BookingDetail[] = Array.isArray(data) ? data : [];

  const totals = useMemo(
    () => rows.reduce((a, b) => ({ value: a.value + b.totalAmount, due: a.due + b.amountDue }), { value: 0, due: 0 }),
    [rows],
  );

  const exportCsv = () => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    // A plain link can't carry the bearer token, so fetch it and hand the
    // browser a blob instead.
    const token = localStorage.getItem("admin_token");
    fetch(`/api/admin/bookings/export.csv?${qs}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `acepaddlers-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const narrowed = activeFilterCount(filters);

  return (
    <div className="flex gap-6 items-start">
      <BookingFilters
        value={filters}
        onChange={set}
        onReset={() => setFilters(EMPTY_FILTERS)}
        onExportCsv={exportCsv}
        resultCount={rows.length}
      />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-semibold text-slate-800">Booking list</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">
              Value <span className="font-semibold text-slate-700">{rupees(totals.value)}</span>
            </span>
            {totals.due > 0 && (
              <span className="text-slate-500">
                Outstanding <span className="font-semibold text-amber-700">{rupees(totals.due)}</span>
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
            <p className="text-sm text-slate-400">
              {narrowed > 0
                ? "No bookings match these filters."
                : "No bookings yet — they'll appear here as they come in."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem]">
                <thead className="bg-slate-50 text-left">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 w-[28%]">Trip details</th>
                    <th className="px-4 py-3 w-[26%]">Contact details</th>
                    <th className="px-4 py-3 w-[22%]">Departure details</th>
                    <th className="px-4 py-3">Booking status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => <BookingRow key={b.id} b={b} />)}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminBookings() {
  return <Inner />;
}
