import { useState } from "react";
import { useListAdminTourTypes, useListAdminTourCategories } from "@workspace/api-client-react";
import type { FieldDef } from "./resources";
import { uploadMedia } from "./upload";
import { useCropExisting } from "./useCropUpload";

/* eslint-disable @typescript-eslint/no-explicit-any */
const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

function MediaField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const m = await uploadMedia(file);
      onChange((m.url ?? m.hlsUrl ?? "") as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void upload(f);
  };
  const { startCrop, cropper, cropBusy, cropError } = useCropExisting(upload);

  const isVideo = !!value && /\.(mp4|webm|mov|m4v|m3u8)$/i.test(value);
  return (
    <div>
      <div className="flex items-end gap-3">
        {value ? (
          <div className="relative h-32 w-48 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {isVideo
              ? <video src={value} muted playsInline className="h-full w-full object-cover" />
              : <img src={value} alt="" className="h-full w-full object-cover" />}
          </div>
        ) : (
          <div className="flex h-32 w-48 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-400">No image</div>
        )}
        <div className="flex flex-col gap-2">
          <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
            <input type="file" accept="image/*,video/*" className="hidden" onChange={onFile} disabled={uploading} />
          </label>
          {value && !isVideo && (
            <button type="button" onClick={() => startCrop(value)} disabled={cropBusy}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {cropBusy ? "Opening…" : "Crop"}
            </button>
          )}
          {value && (
            <button type="button" onClick={() => onChange("")}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Remove</button>
          )}
        </div>
      </div>
      {(error || cropError) && <p className="mt-1 text-xs text-red-600">{error ?? cropError}</p>}
      {cropper}
    </div>
  );
}

/** Multiple images as a thumbnail gallery: upload, reorder, remove. */
function MediaListField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const images = Array.isArray(value) ? value : [];

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const m = await uploadMedia(file);
        if (m.url) uploaded.push(m.url);
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };
  // Crop replaces the picked image in place, keeping its position in the list.
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const { startCrop, cropper, cropBusy } = useCropExisting(async (file) => {
    const m = await uploadMedia(file);
    if (m.url && cropIndex != null) onChange(images.map((src, i) => (i === cropIndex ? m.url! : src)));
    setCropIndex(null);
  });

  const removeAt = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  /** Drag a photo onto another to put it in that position. */
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const moveTo = (from: number, to: number) => {
    if (from === to) return;
    const copy = [...images];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    onChange(copy);
  };
  const moveAt = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const copy = [...images];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };

  return (
    <div>
      <p className="mb-2 text-xs text-slate-400">Drag a photo to reorder. The first one is the cover.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        {images.map((src, i) => (
          <div key={src + i}
            draggable
            onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }}
            onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
            onDragOver={(e) => { if (dragFrom !== null) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(i); } }}
            onDragLeave={() => setDragOver((d) => (d === i ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragFrom ?? Number(e.dataTransfer.getData("text/plain"));
              if (!Number.isNaN(from)) moveTo(from, i);
              setDragFrom(null);
              setDragOver(null);
            }}
            title="Drag to reorder"
            className={`group relative aspect-[4/3] cursor-grab overflow-hidden rounded-lg border bg-slate-100 transition active:cursor-grabbing ${
              dragOver === i && dragFrom !== i ? "border-cyan-500 ring-2 ring-cyan-400" : "border-slate-200"
            } ${dragFrom === i ? "opacity-40" : ""}`}>
            <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <button type="button" title="Move earlier" onClick={() => moveAt(i, -1)} disabled={i === 0}
                className="rounded bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700 disabled:opacity-40">←</button>
              <button type="button" title="Move later" onClick={() => moveAt(i, 1)} disabled={i === images.length - 1}
                className="rounded bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700 disabled:opacity-40">→</button>
              <button type="button" title="Crop" disabled={cropBusy}
                onClick={() => { setCropIndex(i); void startCrop(src); }}
                className="rounded bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700 disabled:opacity-60">Crop</button>
              <button type="button" title="Remove" onClick={() => removeAt(i)}
                className="rounded bg-white/90 px-2 py-0.5 text-xs font-semibold text-red-600">✕</button>
            </div>
          </div>
        ))}
        <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:bg-slate-50">
          <span className="text-2xl leading-none">+</span>
          <span className="mt-1 text-xs">{uploading ? "Uploading…" : "Add images"}</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} disabled={uploading} />
        </label>
      </div>
      {cropper}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Select populated live from an admin-managed lookup table (tour types /
 *  categories) instead of a fixed option list — new values added there show
 *  up here immediately, no code change needed. */
function DynamicSelectField({ source, value, onChange }: { source: "tourTypes" | "tourCategories"; value: string; onChange: (v: string) => void }) {
  const typesQ = useListAdminTourTypes({ query: { enabled: source === "tourTypes" } } as never);
  const categoriesQ = useListAdminTourCategories({ query: { enabled: source === "tourCategories" } } as never);
  const rows = ((source === "tourTypes" ? typesQ.data : categoriesQ.data) ?? []) as { slug: string; label: string }[];
  return (
    <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {rows.map((o) => (
        <option key={o.slug} value={o.slug}>{o.label}</option>
      ))}
    </select>
  );
}

export default function AdminField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
}) {
  const label = (
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
      {field.label}
      {field.required && <span className="text-red-500"> *</span>}
    </label>
  );

  let control: React.ReactNode;
  switch (field.type) {
    case "media":
      control = <MediaField value={value} onChange={onChange} />;
      break;
    case "mediaList":
      control = <MediaListField value={value} onChange={onChange} />;
      break;
    case "textarea":
    case "json":
      control = (
        <textarea
          className={`${inputCls} font-mono`}
          rows={field.type === "json" ? 8 : 4}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "tags":
      control = (
        <textarea
          className={inputCls}
          rows={4}
          value={(Array.isArray(value) ? value : []).join("\n")}
          onChange={(e) =>
            onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))
          }
        />
      );
      break;
    case "select":
      control = (
        <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
      break;
    case "dynamicSelect":
      control = <DynamicSelectField source={field.optionsSource!} value={value} onChange={onChange} />;
      break;
    case "bool":
      control = (
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span className="text-slate-600">{field.label}</span>
        </label>
      );
      break;
    case "toggle": {
      // Switch between two string values (not a boolean), so the stored value
      // stays self-describing in the API and leaves room for more modes later.
      const t = field.toggle!;
      const on = (value ?? t.onValue) === t.onValue;
      control = (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-800">{on ? t.onLabel : t.offLabel}</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">{on ? t.onHelp : t.offHelp}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={field.label}
              onClick={() => onChange(on ? t.offValue : t.onValue)}
              className="relative shrink-0 mt-0.5 h-6 w-11 rounded-full transition-colors"
              style={{ backgroundColor: on ? "#0891b2" : "#cbd5e1" }}>
              {/* left-0 is load-bearing: without it `left` resolves to the
                  knob's static position, which a <button>'s centred text
                  alignment puts at half the track width — the transform then
                  pushes it clean outside the track. */}
              <span
                className="absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: on ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>
        </div>
      );
      break;
    }
    case "number":
      control = (
        <input type="number" className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    case "date":
      control = (
        <input type="date" className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    default:
      control = (
        <input type="text" className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      );
  }

  return (
    <div>
      {field.type !== "bool" && label}
      {control}
      {field.help && <p className="mt-1 text-xs text-slate-400">{field.help}</p>}
    </div>
  );
}
