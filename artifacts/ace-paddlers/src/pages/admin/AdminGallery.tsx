import { useEffect, useMemo, useState } from "react";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Trash2, X } from "lucide-react";
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
const RGL = WidthProvider(GridLayout);
const COLS = 12;
const ROW_H = 40;
const CATEGORIES = ["Rafting", "Camping", "Homestay", "Destinations"];

function toInput(it: GalleryItem, over: Partial<GalleryItem> = {}) {
  const m = { ...it, ...over };
  return {
    src: m.src,
    alt: m.alt ?? null,
    caption: m.caption ?? null,
    category: m.category,
    tall: m.tall,
    sortOrder: m.sortOrder,
    published: m.published ?? true,
    layoutX: m.layoutX ?? null,
    layoutY: m.layoutY ?? null,
    layoutW: m.layoutW ?? null,
    layoutH: m.layoutH ?? null,
  };
}

function Inner() {
  const { data, refetch } = useListAdminGallery();
  const create = useCreateGalleryItem();
  const update = useUpdateGalleryItem();
  const del = useDeleteGalleryItem();

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<Layout[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => { if (Array.isArray(data)) setItems(data); }, [data]);

  // Build the grid layout; auto-place any item that hasn't been arranged yet.
  const layout: Layout[] = useMemo(() => {
    let x = 0, y = 0;
    return items.map((it) => {
      if (it.layoutX != null && it.layoutY != null && it.layoutW != null && it.layoutH != null) {
        return { i: it.id, x: it.layoutX, y: it.layoutY, w: it.layoutW, h: it.layoutH };
      }
      const w = it.tall ? 3 : 4;
      const h = it.tall ? 7 : 5;
      if (x + w > COLS) { x = 0; y += 5; }
      const node = { i: it.id, x, y, w, h };
      x += w;
      return node;
    });
  }, [items]);

  const onStop = (_l: Layout[], _old: Layout, n: Layout) => {
    const it = items.find((x) => x.id === n.i);
    if (!it) return;
    setItems((prev) => prev.map((x) => (x.id === n.i ? { ...x, layoutX: n.x, layoutY: n.y, layoutW: n.w, layoutH: n.h } : x)));
    update.mutate({ id: it.id, data: toInput(it, { layoutX: n.x, layoutY: n.y, layoutW: n.w, layoutH: n.h }) });
  };

  const patch = (id: string, changes: Partial<GalleryItem>) => {
    setItems((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, ...changes } : x));
      const it = next.find((x) => x.id === id);
      if (it) update.mutate({ id, data: toInput(it) });
      return next;
    });
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const m = await uploadMedia(file);
      const maxSort = items.reduce((mx, x) => Math.max(mx, x.sortOrder), -1);
      const maxY = layout.reduce((mx, l) => Math.max(mx, l.y + l.h), 0);
      await create.mutateAsync({
        data: { src: m.url ?? "", category: "Rafting", tall: false, sortOrder: maxSort + 1, published: true, layoutX: 0, layoutY: maxY, layoutW: 4, layoutH: 5 },
      });
      refetch();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const remove = (id: string) => {
    if (!confirm("Delete this image?")) return;
    del.mutate({ id }, { onSuccess: () => { setSelected(null); refetch(); } });
  };

  // Persist the whole arrangement (incl. untouched tiles) so the public
  // gallery switches to the custom layout.
  const saveAll = async () => {
    const map = new Map(currentLayout.map((l) => [l.i, l]));
    await Promise.all(items.map((it) => {
      const l = map.get(it.id) ?? layout.find((x) => x.i === it.id);
      if (!l) return Promise.resolve();
      return update.mutateAsync({ id: it.id, data: toInput(it, { layoutX: l.x, layoutY: l.y, layoutW: l.w, layoutH: l.h }) });
    }));
    setSavedAt(Date.now());
    refetch();
  };

  const sel = items.find((x) => x.id === selected) ?? null;

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-slate-800">Gallery layout</h1>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-emerald-600">Layout saved</span>}
          <button onClick={saveAll} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-cyan-400 hover:text-cyan-700">
            Save layout
          </button>
          <label className="cursor-pointer rounded-lg bg-cyan-600 text-white px-4 py-2 text-sm font-semibold hover:bg-cyan-700">
            {uploading ? "Uploading…" : "+ Add image"}
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
          </label>
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Drag tiles to move them and pull the bottom-right corner to resize. Click a tile to edit its details. Changes save automatically.
      </p>

      <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">
        {/* Canvas */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
          {items.length === 0 ? (
            <p className="text-slate-400 text-sm p-6">No images yet. Upload one to start arranging.</p>
          ) : (
            <RGL
              className="layout"
              layout={layout}
              cols={COLS}
              rowHeight={ROW_H}
              margin={[10, 10]}
              draggableCancel=".no-drag"
              compactType={null}
              preventCollision
              onLayoutChange={setCurrentLayout}
              onDragStop={onStop}
              onResizeStop={onStop}
            >
              {items.map((it) => (
                <div key={it.id}
                  onClick={() => setSelected(it.id)}
                  className={`group relative overflow-hidden rounded-lg border-2 cursor-move ${selected === it.id ? "border-cyan-500" : "border-transparent"}`}>
                  <img src={it.src} alt={it.alt ?? ""} className="w-full h-full object-cover pointer-events-none" />
                  {it.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[11px] px-2 py-1 truncate">{it.caption}</div>
                  )}
                  {it.published === false && (
                    <div className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">HIDDEN</div>
                  )}
                  <button
                    className="no-drag absolute top-1 right-1 w-6 h-6 rounded bg-black/55 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-600"
                    onClick={(e) => { e.stopPropagation(); remove(it.id); }} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </RGL>
          )}
        </div>

        {/* Edit panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sticky top-0">
          {!sel ? (
            <p className="text-sm text-slate-400">Select a tile to edit its caption, category and visibility.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-slate-700">Edit tile</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <img src={sel.src} alt="" className="w-full h-28 object-cover rounded-lg" />
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Caption</label>
                <input className="w-full text-sm rounded border border-slate-300 px-2 py-1.5"
                  defaultValue={sel.caption ?? ""} key={`cap-${sel.id}`}
                  onBlur={(e) => { if (e.target.value !== (sel.caption ?? "")) patch(sel.id, { caption: e.target.value }); }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Alt text</label>
                <input className="w-full text-sm rounded border border-slate-300 px-2 py-1.5"
                  defaultValue={sel.alt ?? ""} key={`alt-${sel.id}`}
                  onBlur={(e) => { if (e.target.value !== (sel.alt ?? "")) patch(sel.id, { alt: e.target.value }); }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Category</label>
                <select className="w-full text-sm rounded border border-slate-300 px-2 py-1.5"
                  value={sel.category} onChange={(e) => patch(sel.id, { category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={sel.published ?? true} onChange={(e) => patch(sel.id, { published: e.target.checked })} />
                Published (visible on the site)
              </label>
              <button onClick={() => remove(sel.id)}
                className="w-full mt-2 rounded-lg border border-red-300 text-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-50">
                Delete image
              </button>
            </div>
          )}
        </div>
      </div>
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
