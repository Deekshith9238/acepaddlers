import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import RichTextField from "@/builder/RichTextField";
import { linesToListHtml, listHtmlToLines } from "@/lib/richText";

/**
 * Tabs of the trip editor, in Vacation Labs' order.
 *
 * VL also has PDF Settings and Experimental. We generate no PDFs, and
 * Experimental is VL's own pagespeed switches, so neither has anything to
 * configure here.
 */
export const TRIP_TABS: { key: string; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "basic", label: "Basic details" },
  { key: "page-details", label: "Facts, FAQs & activities" },
  { key: "prices", label: "Prices & rates" },
  { key: "calendar", label: "Calendar" },
  { key: "settings", label: "Settings" },
  { key: "itinerary", label: "Detailed itinerary" },
  { key: "booking-fields", label: "Extra booking fields" },
  { key: "addons", label: "Addons & cross-sells" },
  { key: "email", label: "E-mail notifications" },
  { key: "location", label: "Location" },
  { key: "reviews", label: "Guest reviews" },
  { key: "advanced", label: "Advanced settings" },
];

export const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
export const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";
export const btnCls =
  "rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60";
export const ghostBtnCls =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50";

export function rupees(n: number): string {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

export function Card({
  title,
  hint,
  children,
  right,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          {hint && <p className="text-sm text-slate-500 mt-1">{hint}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {help && <p className="text-xs text-slate-400 mt-1">{help}</p>}
    </div>
  );
}

/** A labelled on/off choice, matching VL's radio pairs. */
export function Choice({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4" />
      <span className="text-sm text-slate-700">
        <span className="font-medium">{label}</span>
        {help && <span className="block text-xs text-slate-400">{help}</span>}
      </span>
    </label>
  );
}

/** Radio group rendered as VL's stacked options with explanations. */
export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; help?: string }[];
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label key={o.value} className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="mt-0.5 h-4 w-4"
          />
          <span className="text-sm text-slate-700">
            <span className="font-medium">{o.label}</span>
            {o.help && <span className="block text-xs text-slate-400">{o.help}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

export function SaveBar({
  onSave,
  saving,
  saved,
  error,
}: {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onSave} disabled={saving} className={btnCls}>
        {saving ? "Saving…" : "Save"}
      </button>
      {saved && <span className="text-sm text-emerald-600">Saved.</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}

export function TabLink({ tourId, tab, label, active }: { tourId: string; tab: string; label: string; active: boolean }) {
  return (
    <Link
      href={`/admin/tours/${tourId}/${tab}`}
      className={`block px-5 py-3 text-sm font-semibold uppercase tracking-wide no-underline border-b border-slate-100 ${
        active ? "bg-amber-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
      }`}>
      {label}
    </Link>
  );
}

/** Rows of text inputs where the list itself is the value (highlights, etc.). */
export function LineList({
  value,
  onChange,
  placeholder,
  addLabel,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {value.map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={inputCls}
            value={line}
            placeholder={placeholder}
            onChange={(e) => onChange(value.map((v, idx) => (idx === i ? e.target.value : v)))}
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="shrink-0 rounded-md border border-red-300 text-red-600 px-2 py-1.5 text-xs font-semibold hover:bg-red-50">
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, ""])} className="text-sm text-cyan-700 font-semibold hover:underline">
        + {addLabel}
      </button>
    </div>
  );
}

/**
 * A list (inclusions, highlights…) edited as one formatted bullet list.
 * Holds its own HTML so the editor isn't reset on every keystroke; re-seeds
 * only when the stored items change from outside (the trip finishing loading).
 */
export function RichLineList({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [html, setHtml] = useState(() => linesToListHtml(value));
  const emitted = useRef(JSON.stringify(value));
  useEffect(() => {
    const incoming = JSON.stringify(value);
    if (incoming !== emitted.current) {
      emitted.current = incoming;
      setHtml(linesToListHtml(value));
    }
  }, [value]);
  return (
    <RichTextField
      value={html}
      onChange={(h) => {
        setHtml(h);
        const lines = listHtmlToLines(h);
        emitted.current = JSON.stringify(lines);
        onChange(lines);
      }}
    />
  );
}
