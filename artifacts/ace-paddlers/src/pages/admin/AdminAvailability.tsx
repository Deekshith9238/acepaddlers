import { useState } from "react";
import AdminLayout from "@/admin/AdminLayout";
import {
  useListAdminTours,
  useListSlots,
  useGenerateSlots,
  useDeleteSlot,
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

  const slotsQuery = useListSlots(
    { tourId, from, to },
    { query: { enabled: !!tourId } } as never,
  );
  const slots: Slot[] = Array.isArray(slotsQuery.data) ? slotsQuery.data : [];
  const generate = useGenerateSlots();
  const del = useDeleteSlot();

  const toggleDay = (d: number) =>
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]));

  const onGenerate = () => {
    if (!tourId) return;
    generate.mutate(
      { id: tourId, data: { from, to, weekdays, startTime, capacity } },
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
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["Date", "Time", "Capacity", "Booked", "Status", ""].map((h) => (
                  <th key={h} className="text-left font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-slate-400">No slots in range. Generate some above.</td></tr>
              ) : slots.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{s.date}</td>
                  <td className="px-4 py-3">{s.startTime}</td>
                  <td className="px-4 py-3">{s.capacity}</td>
                  <td className="px-4 py-3">{s.bookedCount}</td>
                  <td className="px-4 py-3">{s.status}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { if (confirm("Delete this slot?")) del.mutate({ id: s.id }, { onSuccess: () => slotsQuery.refetch() }); }}
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
      )}
    </>
  );
}

export default function AdminAvailability() {
  return (
    <AdminLayout>
      <Inner />
    </AdminLayout>
  );
}
