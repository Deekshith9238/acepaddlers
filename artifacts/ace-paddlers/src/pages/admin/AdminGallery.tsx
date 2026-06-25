import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Trash2, Star } from "lucide-react";
import AdminLayout from "@/admin/AdminLayout";
import { uploadMedia } from "@/admin/upload";
import {
  useListAdminGallery,
  useCreateGalleryItem,
  useUpdateGalleryItem,
  useDeleteGalleryItem,
  type GalleryItem,
} from "@workspace/api-client-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const CATEGORIES = ["Rafting", "Camping", "Homestay", "Destinations"];

function toInput(it: GalleryItem) {
  return {
    src: it.src,
    alt: it.alt ?? null,
    caption: it.caption ?? null,
    category: it.category,
    tall: it.tall,
    sortOrder: it.sortOrder,
    published: it.published ?? true,
  };
}

function Inner() {
  const { data, refetch } = useListAdminGallery();
  const create = useCreateGalleryItem();
  const update = useUpdateGalleryItem();
  const del = useDeleteGalleryItem();

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { if (Array.isArray(data)) setItems(data); }, [data]);

  const save = (it: GalleryItem) => update.mutate({ id: it.id, data: toInput(it) });

  const patch = (id: string, changes: Partial<GalleryItem>) => {
    setItems((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, ...changes } : x));
      const changed = next.find((x) => x.id === id);
      if (changed) save(changed);
      return next;
    });
  };

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[index], b = items[j];
    await Promise.all([
      update.mutateAsync({ id: a.id, data: { ...toInput(a), sortOrder: b.sortOrder } }),
      update.mutateAsync({ id: b.id, data: { ...toInput(b), sortOrder: a.sortOrder } }),
    ]);
    refetch();
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const m = await uploadMedia(file);
      const maxSort = items.reduce((mx, x) => Math.max(mx, x.sortOrder), -1);
      await create.mutateAsync({ data: { src: m.url ?? "", category: "Rafting", tall: false, sortOrder: maxSort + 1, published: true } });
      refetch();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const remove = (id: string) => {
    if (!confirm("Delete this image?")) return;
    del.mutate({ id }, { onSuccess: () => refetch() });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-slate-800">Gallery</h1>
        <label className="cursor-pointer rounded-lg bg-cyan-600 text-white px-4 py-2 text-sm font-semibold hover:bg-cyan-700">
          {uploading ? "Uploading…" : "+ Add image"}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Drag order with the arrows to set the layout. Mark an image <span className="font-medium">Large</span> to make it a tall feature tile.
      </p>

      {items.length === 0 ? (
        <p className="text-slate-400 text-sm">No images yet. Upload one to get started.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, i) => (
            <div key={it.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className={`relative bg-slate-100 ${it.tall ? "h-56" : "h-36"}`}>
                <img src={it.src} alt={it.alt ?? ""} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 flex gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="w-7 h-7 rounded-md bg-black/55 text-white flex items-center justify-center disabled:opacity-30" title="Move up">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1}
                    className="w-7 h-7 rounded-md bg-black/55 text-white flex items-center justify-center disabled:opacity-30" title="Move down">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => patch(it.id, { tall: !it.tall })}
                  className="absolute top-2 right-2 w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: it.tall ? "#0891b2" : "rgba(0,0,0,0.55)", color: "white" }}
                  title={it.tall ? "Large tile (featured)" : "Make large"}>
                  <Star className="w-4 h-4" fill={it.tall ? "currentColor" : "none"} />
                </button>
                <button onClick={() => remove(it.id)}
                  className="absolute bottom-2 right-2 w-7 h-7 rounded-md bg-black/55 text-white flex items-center justify-center hover:bg-red-600" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <input
                  className="w-full text-sm rounded border border-slate-200 px-2 py-1.5"
                  placeholder="Caption"
                  defaultValue={it.caption ?? ""}
                  onBlur={(e) => { if (e.target.value !== (it.caption ?? "")) patch(it.id, { caption: e.target.value }); }}
                />
                <div className="flex items-center justify-between gap-2">
                  <select className="text-sm rounded border border-slate-200 px-2 py-1.5 flex-1"
                    value={it.category} onChange={(e) => patch(it.id, { category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                    <input type="checkbox" checked={it.published ?? true} onChange={(e) => patch(it.id, { published: e.target.checked })} />
                    Published
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function AdminGallery() {
  return (
    <AdminLayout>
      <Inner />
    </AdminLayout>
  );
}
