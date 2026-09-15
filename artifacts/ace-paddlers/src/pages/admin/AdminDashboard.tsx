import { Link } from "wouter";
import { RESOURCES } from "@/admin/resources";
import { useListBookings, useUpdateBookingStatus, useAdminMe, type BookingDetail } from "@workspace/api-client-react";
import OperationsDashboard from "@/admin/OperationsDashboard";
import { StatusBadge } from "@/admin/booking/sections";

/* eslint-disable @typescript-eslint/no-explicit-any */
function StatCard({ label, value, href, accent }: { label: string; value: number | string; href: string; accent?: boolean }) {
  return (
    <Link href={href}
      className="block rounded-2xl border bg-white p-5 no-underline transition-shadow hover:shadow-md"
      style={{ borderColor: accent && value !== 0 ? "#f59e0b" : "#e2e8f0" }}>
      <div className="text-3xl font-semibold" style={{ color: accent && value !== 0 ? "#b45309" : "#1e293b" }}>{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </Link>
  );
}

function useCount(key: string): number | string {
  const q = RESOURCES[key].hooks.useList();
  return Array.isArray(q.data) ? q.data.length : "—";
}

function Inner() {
  const destinations = useCount("destinations");
  const tours = useCount("tours");
  const blog = useCount("blog");
  const gallery = useCount("gallery");

  // A role without booking access gets 403s here; showing "0 bookings" would
  // read as "business is quiet" rather than "you can't see this".
  const { data: me } = useAdminMe();
  const seesBookings = me?.role === "viewer" || (me?.capabilities ?? []).includes("bookings");
  const { data, refetch } = useListBookings(undefined, { query: { enabled: seesBookings } } as never);
  const update = useUpdateBookingStatus();
  const bookings: BookingDetail[] = Array.isArray(data) ? data : [];
  const today = new Date().toISOString().slice(0, 10);
  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = bookings
    .filter((b) => b.status === "confirmed" && (b.date ?? "") >= today)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .slice(0, 6);
  const recent = bookings.slice(0, 6);

  const confirm = (id: string) => update.mutate({ id, data: { status: "confirmed" } }, { onSuccess: () => refetch() });

  return (
    <>
      {/* What is running, and who is on it — the first thing the team needs. */}
      {seesBookings ? (
        <div className="mb-8">
          <OperationsDashboard />
        </div>
      ) : (
        <h1 className="text-2xl font-semibold text-slate-800 mb-6">Dashboard</h1>
      )}

      {/* Content counts matter to an editor, who has no operations view. */}
      {!seesBookings && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Destinations" value={destinations} href="/admin/destinations" />
          <StatCard label="Tours" value={tours} href="/admin/tours" />
          <StatCard label="Blog posts" value={blog} href="/admin/blog" />
          <StatCard label="Gallery" value={gallery} href="/admin/gallery" />
        </div>
      )}

      {seesBookings && (
      <div className="mb-8">
        {/* Needs attention */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Needs attention</h2>
            <Link href="/admin/bookings" className="text-xs text-cyan-600 no-underline hover:underline">All bookings →</Link>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No pending requests — you're all caught up. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pending.slice(0, 6).map((b) => (
                <li key={b.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{b.tourTitle}</div>
                    <div className="text-xs text-slate-400">{b.date} · {b.customerName} · {b.numGuests} guest(s)</div>
                  </div>
                  <button onClick={() => confirm(b.id)} className="shrink-0 text-xs font-semibold text-emerald-600 hover:underline">Confirm</button>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
      )}

      {seesBookings && (
      <section className="rounded-2xl border border-slate-200 bg-white mb-8 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Recent bookings</h2>
          <Link href="/admin/bookings" className="text-xs text-cyan-600 no-underline hover:underline">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-6">No bookings yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {recent.map((b) => (
                <tr key={b.id} className="border-t border-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{b.bookingRef}</td>
                  <td className="px-3 py-3">{b.tourTitle}</td>
                  <td className="px-3 py-3 text-slate-500">{b.customerName}</td>
                  <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{b.date}</td>
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="font-semibold text-slate-800 mb-3">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            ["+ New tour", "/admin/tours/new"],
            ["+ New destination", "/admin/destinations/new"],
            ["+ New blog post", "/admin/blog/new"],
            ["Manage availability", "/admin/availability"],
            ["Manage gallery", "/admin/gallery"],
          ].map(([label, href]) => (
            <Link key={href} href={href}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 no-underline hover:border-cyan-400 hover:text-cyan-700">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <Inner />
  );
}
