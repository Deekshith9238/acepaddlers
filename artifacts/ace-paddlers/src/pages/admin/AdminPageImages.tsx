import { useEffect, useState } from "react";
import { uploadMedia } from "@/admin/upload";
import { useCropExisting } from "@/admin/useCropUpload";
import {
  PAGE_IMAGE_KEYS,
  fetchAdminPageImages,
  saveAdminPageImages,
  type PageImagesMap,
} from "@/lib/page-images";

type Status = { kind: "idle" | "saving" | "saved" | "error"; msg?: string };

const inputCls =
  "flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

function Inner() {
  const [map, setMap] = useState<PageImagesMap | null>(null);
  const [page, setPage] = useState<string>(PAGE_IMAGE_KEYS[0].key);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  useEffect(() => {
    fetchAdminPageImages()
      .then(setMap)
      .catch(() => setStatus({ kind: "error", msg: "Couldn't load page images." }));
  }, []);

  const images = map?.[page] ?? [];

  const setImages = (next: string[]) => {
    setMap((prev) => ({ ...(prev ?? {}), [page]: next }));
    setStatus({ kind: "idle" });
  };
  const addUrl = () => {
    const v = urlInput.trim();
    if (!v) return;
    setImages([...images, v]);
    setUrlInput("");
  };
  const removeAt = (i: number) => setImages(images.filter((_, idx) => idx !== i));
  const moveAt = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const copy = [...images];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setImages(copy);
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const m = await uploadMedia(file);
        if (m.url) urls.push(m.url);
      }
      if (urls.length) setImages([...images, ...urls]);
    } finally {
      setUploading(false);
    }
  };
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const { startCrop, cropper, cropBusy } = useCropExisting(async (file) => {
    const m = await uploadMedia(file);
    if (m.url && cropIndex != null) setImages(images.map((src, i) => (i === cropIndex ? m.url! : src)));
    setCropIndex(null);
  });

  const onSave = async () => {
    if (!map) return;
    setStatus({ kind: "saving" });
    try {
      const saved = await saveAdminPageImages(map);
      setMap(saved);
      setStatus({ kind: "saved", msg: "Saved. The page's hero now rotates through these images." });
    } catch {
      setStatus({ kind: "error", msg: "Save failed. Please try again." });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Page images</h1>
        <button
          onClick={onSave}
          disabled={status.kind === "saving" || !map}
          className="rounded-lg bg-cyan-600 text-white px-5 py-2 text-sm font-semibold hover:bg-cyan-700 disabled:opacity-60">
          {status.kind === "saving" ? "Saving…" : "Save"}
        </button>
      </div>

      {status.msg && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={
            status.kind === "error"
              ? { background: "#fef2f2", color: "#b91c1c" }
              : { background: "#ecfdf5", color: "#047857" }
          }>
          {status.msg}
        </div>
      )}

      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        Add one or more images to a page's top banner. With two or more, the banner auto-rotates
        between them. Leave a page empty to keep its default look.
      </p>

      <div className="max-w-3xl">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Page</label>
        <select
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          value={page}
          onChange={(e) => setPage(e.target.value)}>
          {PAGE_IMAGE_KEYS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>

        {!map ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            {images.length === 0 ? (
              <p className="text-sm text-slate-400 mb-4">No images set — this page uses its default banner.</p>
            ) : (
              <div className="space-y-3 mb-5">
                {images.map((src, i) => (
                  <div key={src + i} className="flex items-center gap-3">
                    <img src={src} alt="" className="h-14 w-20 rounded-lg object-cover border border-slate-200 shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-xs text-slate-500">{src}</span>
                    <div className="flex gap-1 shrink-0">
                      <button className="rounded-md border border-slate-300 text-slate-600 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
                        onClick={() => moveAt(i, -1)} disabled={i === 0}>↑</button>
                      <button className="rounded-md border border-slate-300 text-slate-600 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
                        onClick={() => moveAt(i, 1)} disabled={i === images.length - 1}>↓</button>
                      <button className="rounded-md border border-slate-300 text-slate-600 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
                        disabled={cropBusy} onClick={() => { setCropIndex(i); void startCrop(src); }}>Crop</button>
                      <button className="rounded-md border border-red-300 text-red-600 px-2 py-1 text-xs font-semibold hover:bg-red-50"
                        onClick={() => removeAt(i)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
              <input className={inputCls} placeholder="https://… image URL"
                value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} />
              <button onClick={addUrl}
                className="rounded-lg border border-slate-300 text-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                Add URL
              </button>
              <label className="shrink-0 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                {uploading ? "Uploading…" : "Upload image"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        )}
      </div>
      {cropper}
    </>
  );
}

export default function AdminPageImages() {
  return (
    <Inner />
  );
}
