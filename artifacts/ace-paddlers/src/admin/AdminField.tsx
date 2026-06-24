import { useState } from "react";
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
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
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
    case "bool":
      control = (
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span className="text-slate-600">{field.label}</span>
        </label>
      );
      break;
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
