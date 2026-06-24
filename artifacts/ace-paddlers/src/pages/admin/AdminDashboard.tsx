import { Link } from "wouter";
import AdminLayout from "@/admin/AdminLayout";
import { RESOURCES } from "@/admin/resources";

function ResourceCard({ resourceKey, label }: { resourceKey: string; label: string }) {
  const cfg = RESOURCES[resourceKey];
  const { data } = cfg.hooks.useList();
  const count = Array.isArray(data) ? data.length : undefined;
  return (
    <Link
      href={`/admin/${resourceKey}`}
      className="block rounded-2xl border border-slate-200 bg-white p-6 no-underline transition-shadow hover:shadow-md">
      <div className="text-3xl font-semibold text-slate-800">{count ?? "—"}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </Link>
  );
}

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Object.values(RESOURCES).map((r) => (
          <ResourceCard key={r.key} resourceKey={r.key} label={r.label} />
        ))}
      </div>
    </AdminLayout>
  );
}
