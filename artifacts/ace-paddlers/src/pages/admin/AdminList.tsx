import { Link, useParams } from "wouter";
import AdminLayout from "@/admin/AdminLayout";
import { RESOURCES, type ResourceConfig } from "@/admin/resources";

/* eslint-disable @typescript-eslint/no-explicit-any */
function ListInner({ cfg }: { cfg: ResourceConfig }) {
  const { data, isLoading } = cfg.hooks.useList();
  const del = cfg.hooks.useDelete();
  const rows: any[] = Array.isArray(data) ? data : [];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">{cfg.label}</h1>
        <Link href={`/admin/${cfg.key}/new`}
          className="rounded-lg bg-cyan-600 text-white px-4 py-2 text-sm font-semibold no-underline hover:bg-cyan-700">
          + New {cfg.singular}
        </Link>
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-400 text-sm">No {cfg.label.toLowerCase()} yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {cfg.listColumns.map((c) => (
                  <th key={c.field} className="text-left font-medium px-4 py-3">{c.label}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  {cfg.listColumns.map((c) => (
                    <td key={c.field} className="px-4 py-3 text-slate-700">{formatCell(row[c.field])}</td>
                  ))}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link href={`/admin/${cfg.key}/${row.id}`} className="text-cyan-600 no-underline hover:underline">Edit</Link>
                    <button
                      onClick={() => {
                        if (confirm("Delete this item?")) del.mutate({ id: row.id });
                      }}
                      className="ml-4 text-red-500 hover:underline">
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

function formatCell(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v == null) return "—";
  return String(v);
}

export default function AdminList() {
  const { resource } = useParams<{ resource: string }>();
  const cfg = RESOURCES[resource];
  return (
    <AdminLayout>
      {cfg ? <ListInner key={resource} cfg={cfg} /> : <p>Unknown resource.</p>}
    </AdminLayout>
  );
}
