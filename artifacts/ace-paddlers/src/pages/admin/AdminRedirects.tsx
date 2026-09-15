import { useState } from "react";
import {
  useListRedirects,
  useCreateRedirect,
  useUpdateRedirect,
  useDeleteRedirect,
  type RedirectDetail,
} from "@workspace/api-client-react";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

const ERRORS: Record<string, string> = {
  from_path_exists: "That path already redirects somewhere.",
  from_must_be_a_path: "The old URL must be a path starting with /.",
  to_must_be_a_path_or_url: "The new URL must be a path or a full https:// address.",
  self_redirect: "A path can't redirect to itself.",
  invalid_status_code: "Use 301 (permanent) or 302 (temporary).",
  to_required: "Enter where it should go.",
};

function errMsg(err: unknown, fallback = "Something went wrong."): string {
  const code = (err as { data?: { error?: string } })?.data?.error;
  return (code && ERRORS[code]) ?? fallback;
}

function Inner() {
  const { data, refetch, isLoading } = useListRedirects();
  const create = useCreateRedirect();
  const update = useUpdateRedirect();
  const remove = useDeleteRedirect();
  const [form, setForm] = useState({ fromPath: "", toPath: "", statusCode: "301" });
  const [error, setError] = useState<string | null>(null);

  const rows: RedirectDetail[] = data?.redirects ?? [];
  const chains = data?.chains ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate(
      { data: { fromPath: form.fromPath.trim(), toPath: form.toPath.trim(), statusCode: Number(form.statusCode) as 301 | 302 } },
      {
        onSuccess: () => { setForm({ fromPath: "", toPath: "", statusCode: "301" }); refetch(); },
        onError: (err) => setError(errMsg(err, "Couldn't add that redirect.")),
      },
    );
  };

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 mb-1">Redirects</h1>
      <p className="text-sm text-slate-500 mb-6">
        Send an old URL somewhere new, so a link from a search result or an old brochure never lands on a 404.
      </p>

      {chains.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-6">
          <h2 className="text-sm font-semibold text-amber-900">
            {chains.length} redirect {chains.length === 1 ? "chain" : "chains"}
          </h2>
          <p className="text-xs text-amber-800/80 mt-1 mb-2">
            These hop twice before landing. Search engines stop following after a few hops — point the first one straight at the destination.
          </p>
          <ul className="space-y-1 text-sm text-amber-900 font-mono">
            {chains.map((c) => (
              <li key={c.from}>{c.from} → {c.to} → {c.then}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 grid gap-3 sm:grid-cols-4">
        <input className={inputCls} placeholder="/old-page" value={form.fromPath} onChange={(e) => setForm({ ...form, fromPath: e.target.value })} />
        <input className={inputCls} placeholder="/new-page" value={form.toPath} onChange={(e) => setForm({ ...form, toPath: e.target.value })} />
        <select className={inputCls} value={form.statusCode} onChange={(e) => setForm({ ...form, statusCode: e.target.value })}>
          <option value="301">301 — permanent</option>
          <option value="302">302 — temporary</option>
        </select>
        <button type="submit" disabled={create.isPending} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
          {create.isPending ? "Adding…" : "Add redirect"}
        </button>
        {error && <p className="sm:col-span-4 text-sm text-red-600">{error}</p>}
      </form>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-400">No redirects yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">From</th><th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Type</th><th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-sm text-slate-700">{r.fromPath}</td>
                  <td className="px-4 py-3 font-mono text-sm text-slate-600">{r.toPath}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{r.statusCode}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {r.hits}
                    {r.hits === 0 && <span className="text-xs text-slate-400"> — never</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => update.mutate({ id: r.id, data: { fromPath: r.fromPath, toPath: r.toPath, active: !r.active } }, { onSuccess: () => { refetch(); } })}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${r.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {r.active ? "On" : "Off"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => remove.mutate({ id: r.id }, { onSuccess: () => { refetch(); } })} className="text-xs text-red-600 hover:underline">Delete</button>
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

export default function AdminRedirects() {
  return (
    <Inner />
  );
}
