import AdminLayout from "@/admin/AdminLayout";
import { useListBookings, useUpdateBookingStatus, type BookingDetail } from "@workspace/api-client-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "#b45309",
  confirmed: "#047857",
  cancelled: "#b91c1c",
  completed: "#475569",
};

function Inner() {
  const { data, refetch, isLoading } = useListBookings();
  const update = useUpdateBookingStatus();
  const rows: BookingDetail[] = Array.isArray(data) ? data : [];

  const setStatus = (id: string, status: string) =>
    update.mutate(
      { id, data: { status: status as BookingDetail["status"] } },
      { onSuccess: () => refetch() },
    );

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Bookings</h1>
      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-400 text-sm">No bookings yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["Ref", "Tour", "Date", "Customer", "Guests", "Total", "Status", ""].map((h) => (
                  <th key={h} className="text-left font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 font-mono text-xs">{b.bookingRef}</td>
                  <td className="px-4 py-3">{b.tourTitle}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.date} {b.startTime}</td>
                  <td className="px-4 py-3">
                    <div>{b.customerName}</div>
                    <div className="text-xs text-slate-400">{b.customerEmail}</div>
                    <div className="text-xs text-slate-400">{b.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3">{b.numGuests}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.currency} {b.totalAmount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold uppercase" style={{ color: STATUS_COLORS[b.status] }}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {b.status !== "confirmed" && b.status !== "cancelled" && (
                      <button onClick={() => setStatus(b.id, "confirmed")} className="text-emerald-600 hover:underline mr-3">Confirm</button>
                    )}
                    {b.status !== "cancelled" && (
                      <button onClick={() => setStatus(b.id, "cancelled")} className="text-red-500 hover:underline mr-3">Cancel</button>
                    )}
                    {b.status === "confirmed" && (
                      <button onClick={() => setStatus(b.id, "completed")} className="text-slate-500 hover:underline">Complete</button>
                    )}
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

export default function AdminBookings() {
  return (
    <AdminLayout>
      <Inner />
    </AdminLayout>
  );
}
