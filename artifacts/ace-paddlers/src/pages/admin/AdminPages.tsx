import { Link } from "wouter";
import AdminLayout from "@/admin/AdminLayout";
import { useListAdminPages } from "@workspace/api-client-react";
import { EDITABLE_PAGES } from "@/builder/pages";

/* eslint-disable @typescript-eslint/no-explicit-any */
function Inner() {
  const { data } = useListAdminPages();
  const saved = new Map((Array.isArray(data) ? data : []).map((p: any) => [p.slug, p]));
  const pages = EDITABLE_PAGES.map((ep) => ({ ...ep, status: saved.get(ep.slug)?.status ?? "draft" }));

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Pages</h1>
      <p className="text-sm text-slate-500 mb-6">Compose marketing pages by dragging in sections. Publish to make changes live.</p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left font-medium px-4 py-3">Page</th>
              <th className="text-left font-medium px-4 py-3">Path</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.slug} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-700">{p.title}</td>
                <td className="px-4 py-3 text-slate-500">{p.path}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold uppercase" style={{ color: p.status === "published" ? "#047857" : "#b45309" }}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/pages/${p.slug}`} className="text-cyan-600 no-underline hover:underline">Open builder →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AdminPages() {
  return (
    <AdminLayout>
      <Inner />
    </AdminLayout>
  );
}
