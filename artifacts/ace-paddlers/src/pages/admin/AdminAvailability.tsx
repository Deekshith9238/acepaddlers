import { useEffect, useState } from "react";
import {
  useGetTourVariants,
  useListAdminTours,
  useListSlots,
  useGenerateSlots,
  useDeleteSlot,
  useBulkDeleteSlots,
  type Slot,
} from "@workspace/api-client-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const inputCls = "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function Inner() {
  const { data: tours } = useListAdminTours();
  const tourList: any[] = Array.isArray(tours) ? tours : [];

  const [tourId, setTourId] = useState("");
  const [from, setFrom] = useState(todayPlus(0));
  const [to, setTo] = useState(todayPlus(30));
  const [weekdays, setWeekdays] = useState<number[]>([6, 0]); // Sat, Sun
  const [startTime, setStartTime] = useState("09:00");
  const [capacity, setCapacity] = useState(8);

  // Departures belong to a variant on trips that have them, so generating a day
  // has to say which. Omitting one opens the day for every active variant.
  const { data: variantData } = useGetTourVariants(tourId, { query: { enabled: !!tourId } } as never);
  const variants = (variantData?.variants ?? []).filter((v: any) => v.active);
  const [variantId, setVariantId] = useState("");
  useEffect(() => setVariantId(""), [tourId]);
  const variantLabel = (id: string | null | undefined) =>
    id ? (variants.find((v: any) => v.id === id)?.label ?? "—") : variants.length > 0 ? "All" : "—";

  const slotsQuery = useListSlots(
    { tourId, from, to },
    { query: { enabled: !!tourId } } as never,
  );
  const slots: Slot[] = Array.isArray(slotsQuery.data) ? slotsQuery.data : [];
  const generate = useGenerateSlots();
  const del = useDeleteSlot();
  const bulkDelete = useBulkDeleteSlots();

  // Multi-select for bulk delete. Booked slots can't be selected/deleted.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const deletableSlots = slots.filter((s) => s.bookedCount === 0);
  const allSelected = deletableSlots.length > 0 && deletableSlots.every((s) => selected.has(s.id));

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAll = () =>
    setSelected(allSelected ? new Set() : new Set(deletableSlots.map((s) => s.id)));

  const afterDelete = () => {
    setSelected(new Set());
    slotsQuery.refetch();
  };

  const onDeleteSelected = () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected slot(s)?`)) return;
    bulkDelete.mutate({ data: { ids: [...selected] } }, { onSuccess: afterDelete });
  };

  const onDeleteAllInRange = () => {
    if (!tourId) return;
    if (!confirm(`Delete ALL unbooked slots for this tour from ${from} to ${to}? Booked slots are kept.`)) return;
    bulkDelete.mutate({ data: { tourId, from, to } }, { onSuccess: afterDelete });
  };

  const toggleDay = (d: number) =>
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]));

  const onGenerate = () => {
    if (!tourId) return;
    generate.mutate(
      { id: tourId, data: { from, to, weekdays, startTime, capacity, variantId: variantId || null } },
      { onSuccess: () => slotsQuery.refetch() },
    );
  };

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Availability</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-8">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Tour</label>
        <select className={`${inputCls} w-full max-w-md mb-5`} value={tourId} onChange={(e) => setTourId(e.target.value)}>
          <option value="">Select a tour…</option>
          {tourList.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>

        {tourId && (
          <>
            <div className="text-sm font-semibold text-slate-700 mb-3">Generate slots</div>
            <div className="flex flex-wrap items-end gap-4">
              {variants.length > 0 && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Variant</label>
                  <select className={inputCls} value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                    <option value="">All variants</option>
                    {variants.map((v: any) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-500 mb-1">From</label>
                <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">To</label>
                <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Time</label>
                <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Capacity</label>
                <input type="number" className={`${inputCls} w-24`} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {WEEKDAYS.map((w, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className="rounded-full px-3 py-1.5 text-sm border"
                  style={weekdays.includes(i)
                    ? { backgroundColor: "#0891b2", color: "white", borderColor: "#0891b2" }
                    : { backgroundColor: "white", color: "#475569", borderColor: "#cbd5e1" }}>
                  {w}
                </button>
              ))}
            </div>
            <button onClick={onGenerate} disabled={generate.isPending}
              className="mt-5 rounded-lg bg-cyan-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
              {generate.isPending ? "Generating…" : "Generate slots"}
            </button>
            {generate.isSuccess && (
              <span className="ml-3 text-sm text-emerald-600">Created {(generate.data as any)?.created ?? 0} slot(s).</span>
            )}
          </>
        )}
      </div>

      {tourId && (
        <>
          {/* Bulk actions toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <button
              onClick={onDeleteSelected}
              disabled={selected.size === 0 || bulkDelete.isPending}
              className="rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
              Delete selected ({selected.size})
            </button>
            <button
              onClick={onDeleteAllInRange}
              disabled={slots.length === 0 || bulkDelete.isPending}
              className="rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
              Delete all in range ({from} → {to})
            </button>
            {bulkDelete.isPending && <span className="text-sm text-slate-500">Deleting…</span>}
            {bulkDelete.isSuccess && (
              <span className="text-sm text-emerald-600">
                Deleted {(bulkDelete.data as any)?.deleted ?? 0}
                {((bulkDelete.data as any)?.skipped ?? 0) > 0 && `, kept ${(bulkDelete.data as any).skipped} booked`}.
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      title="Select all unbooked" />
                  </th>
                  {[...(variants.length > 0 ? ["Variant"] : []), "Date", "Time", "Capacity", "Booked", "Status", ""].map((h) => (
                    <th key={h} className="text-left font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.length === 0 ? (
                  <tr><td colSpan={variants.length > 0 ? 8 : 7} className="px-4 py-6 text-slate-400">No slots in range. Generate some above.</td></tr>
                ) : slots.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(s.id)} disabled={s.bookedCount > 0}
                        onChange={() => toggleSelect(s.id)}
                        title={s.bookedCount > 0 ? "Has bookings — can't delete" : ""} />
                    </td>
                    {variants.length > 0 && <td className="px-4 py-3">{variantLabel((s as any).variantId)}</td>}
                    <td className="px-4 py-3">{s.date}</td>
                    <td className="px-4 py-3">{s.startTime}</td>
                    <td className="px-4 py-3">{s.capacity}</td>
                    <td className="px-4 py-3">{s.bookedCount}</td>
                    <td className="px-4 py-3">{s.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { if (confirm("Delete this slot?")) del.mutate({ id: s.id }, { onSuccess: afterDelete }); }}
                        className="text-red-500 hover:underline" disabled={s.bookedCount > 0}
                        title={s.bookedCount > 0 ? "Has bookings" : ""}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

export default function AdminAvailability() {
  return (
    <Inner />
  );
}
