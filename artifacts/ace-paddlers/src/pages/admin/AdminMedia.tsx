import { useState } from "react";
import { useListMedia, useDeleteMedia, useForceDeleteMedia, type MediaAsset, type ListMediaKind } from "@workspace/api-client-react";
import { uploadMedia } from "@/admin/upload";

function bytesLabel(m: MediaAsset): string {
  return [m.width && m.height ? `${m.width}×${m.height}` : null, m.mime].filter(Boolean).join(" · ");
}

function Inner() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<ListMediaKind | "">("");
  const { data, refetch, isLoading } = useListMedia({ ...(q ? { q } : {}), ...(kind ? { kind } : {}) });
  const remove = useDeleteMedia();
  const forceRemove = useForceDeleteMedia();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const rows: MediaAsset[] = Array.isArray(data) ? data : [];

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of files) await uploadMedia(f);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const del = (m: MediaAsset, force: boolean) => {
    setError(null);
    const mutation = force ? forceRemove : remove;
    mutation.mutate(
      { id: m.id },
      {
        onSuccess: () => { setConfirmId(null); refetch(); },
        onError: (err: unknown) => {
          const d = (err as { data?: { error?: string; usageCount?: number } })?.data;
          if (d?.error === "in_use") {
            setError(`That file is used in ${d.usageCount} place(s). Delete it anyway from the "Used" badge if you're sure.`);
            setConfirmId(m.id);
          } else {
            setError("Couldn't delete that file.");
          }
        },
      },
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Media library</h1>
          <p className="text-sm text-slate-500 mt-1">
            Everything uploaded, with a count of where each file is used so nothing live gets deleted by mistake.
          </p>
        </div>
        <label className="cursor-pointer rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
          {uploading ? "Uploading…" : "Upload files"}
          <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onFiles} disabled={uploading} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Search by filename…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" value={kind} onChange={(e) => setKind(e.target.value as ListMediaKind | "")}>
          <option value="">All files</option><option value="image">Images</option><option value="video">Videos</option>
        </select>
        <span className="text-xs text-slate-400">{rows.length} file(s)</span>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-400">{q ? "Nothing matches that search." : "No files uploaded yet."}</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
                {m.kind === "image" && m.url ? (
                  <img src={m.url} alt={m.filename ?? ""} className="h-full w-full object-cover" loading="lazy" />
                ) : m.posterUrl ? (
                  <img src={m.posterUrl} alt={m.filename ?? ""} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-xs text-slate-400">{m.kind}</span>
                )}
              </div>
              <div className="p-3">
                <div className="truncate text-xs font-medium text-slate-700" title={m.filename ?? ""}>{m.filename ?? "untitled"}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{bytesLabel(m)}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    m.usageCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {m.usageCount > 0 ? `used ${m.usageCount}×` : "unused"}
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { if (m.url) { navigator.clipboard.writeText(m.url); setCopied(m.id); setTimeout(() => setCopied(null), 1200); } }}
                      className="text-[10px] font-semibold text-cyan-600 hover:underline">
                      {copied === m.id ? "Copied" : "Copy URL"}
                    </button>
                    <button type="button" onClick={() => del(m, confirmId === m.id)} className="text-[10px] font-semibold text-red-600 hover:underline">
                      {confirmId === m.id ? "Really?" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function AdminMedia() {
  return (
    <Inner />
  );
}
