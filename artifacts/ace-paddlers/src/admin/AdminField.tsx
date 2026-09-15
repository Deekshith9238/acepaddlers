import { useState } from "react";
import { useListAdminTourTypes, useListAdminTourCategories } from "@workspace/api-client-react";
import type { FieldDef } from "./resources";
import { uploadMedia } from "./upload";

/* eslint-disable @typescript-eslint/no-explicit-any */
const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

function MediaField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  return (
    <div>
      <div className="flex items-center gap-3">
        <input type="text" className={inputCls} value={value ?? ""} placeholder="https://… or upload"
          onChange={(e) => onChange(e.target.value)} />
        <label className="shrink-0 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          {uploading ? "Uploading…" : "Upload"}
          <input type="file" accept="image/*,video/*" className="hidden" onChange={onFile} disabled={uploading} />
        </label>
      </div>
      {value && /\.(jpe?g|png|webp|gif|avif)$/i.test(value) && (
        <img src={value} alt="preview" className="mt-2 h-24 rounded-lg object-cover border border-slate-200" />
      )}
      {value && /\.(mp4|webm|mov|m4v)$/i.test(value) && (
        <video src={value} controls muted playsInline className="mt-2 h-24 rounded-lg object-cover border border-slate-200" />
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Multiple images: upload files or paste URLs; reorder and remove. */
function MediaListField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const images = Array.isArray(value) ? value : [];

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
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
      e.target.value = "";
    }
  };

  const addUrl = () => {
    const v = urlInput.trim();
    if (!v) return;
    onChange([...images, v]);
    setUrlInput("");
  };
  const removeAt = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const moveAt = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const copy = [...images];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };

  return (
    <div>
      {images.length > 0 && (
        <div className="mb-3 space-y-2">
          {images.map((src, i) => (
            <div key={src + i} className="flex items-center gap-2">
              <img src={src} alt="" className="h-12 w-16 rounded-lg object-cover border border-slate-200 shrink-0" />
              <span className="flex-1 min-w-0 truncate text-xs text-slate-500">{src}</span>
              <div className="flex gap-1 shrink-0">
                <button type="button" onClick={() => moveAt(i, -1)} disabled={i === 0}
                  className="rounded-md border border-slate-300 text-slate-600 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">↑</button>
                <button type="button" onClick={() => moveAt(i, 1)} disabled={i === images.length - 1}
                  className="rounded-md border border-slate-300 text-slate-600 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">↓</button>
                <button type="button" onClick={() => removeAt(i)}
                  className="rounded-md border border-red-300 text-red-600 px-2 py-1 text-xs font-semibold hover:bg-red-50">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input type="text" className={`${inputCls} flex-1 min-w-[160px]`} value={urlInput} placeholder="https://… or upload"
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} />
        <button type="button" onClick={addUrl}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Add URL
        </button>
        <label className="shrink-0 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          {uploading ? "Uploading…" : "Upload images"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} disabled={uploading} />
        </label>
      </div>
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
