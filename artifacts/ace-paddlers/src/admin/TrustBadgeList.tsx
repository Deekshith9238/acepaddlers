import { ShieldCheck } from "lucide-react";

/** Editable list of trust badges, shown as they appear under Book Now. */
export function TrustBadgeList({ value, onChange, disabled, placeholder = "NOLS certified guides" }: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
  return (
    <div className="space-y-2">
      {value.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-700" />
          <input className={inp} value={b} placeholder={placeholder} disabled={disabled}
            onChange={(e) => onChange(value.map((x, idx) => (idx === i ? e.target.value : x)))} />
          <button type="button" title="Move up" disabled={disabled || i === 0}
            onClick={() => { const c = [...value]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; onChange(c); }}
            className="shrink-0 rounded-md border border-slate-300 text-slate-600 px-2 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">↑</button>
          <button type="button" title="Remove" disabled={disabled} onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="shrink-0 rounded-md border border-red-300 text-red-600 px-2 py-1.5 text-xs font-semibold hover:bg-red-50">✕</button>
        </div>
      ))}
      <button type="button" disabled={disabled} onClick={() => onChange([...value, ""])}
        className="text-sm text-cyan-700 font-semibold hover:underline">+ Add badge</button>
    </div>
  );
}
