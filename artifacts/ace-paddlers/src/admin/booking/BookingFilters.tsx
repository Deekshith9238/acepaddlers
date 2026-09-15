import { useState } from "react";
import { useListAdminTours, useListAdminTourCategories, useListAgents } from "@workspace/api-client-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BookingFilterState {
  q: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  source: string;
  tourId: string;
  category: string;
  bookedFrom: string;
  bookedTo: string;
  departsFrom: string;
  departsTo: string;
  balanceDue: boolean;
  agentId: string;
}

export const EMPTY_FILTERS: BookingFilterState = {
  q: "",
  status: "open",
  paymentStatus: "",
  paymentMethod: "",
  source: "",
  tourId: "",
  category: "",
  bookedFrom: "",
  bookedTo: "",
  departsFrom: "",
  departsTo: "",
  balanceDue: false,
  agentId: "",
};

/** Everything except the default status counts as "you narrowed something". */
export function activeFilterCount(f: BookingFilterState): number {
  let n = 0;
  for (const [k, v] of Object.entries(f)) {
    if (k === "status") {
      if (v !== "open") n += 1;
    } else if (v !== "" && v !== false) n += 1;
  }
  return n;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1";

const STATUSES = [
  { value: "open", label: "Open (pending + confirmed)" },
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "cart_abandoned", label: "Cart abandoned" },
];

const SOURCES = ["website", "whatsapp", "phone", "walk_in", "agent", "admin"];
const PAY_STATUSES = ["unpaid", "deposit", "paid", "refunded"];
const PAY_METHODS = ["upi", "card", "netbanking", "wallet", "cash", "bank_transfer", "cheque"];

/**
 * One collapsible block of the filter rail, matching VL's disclosure sections.
 * A section that holds a value starts open, so a narrowed list never hides why.
 */
function Section({
  title,
  children,
  hasValue,
}: {
  title: string;
  children: React.ReactNode;
  hasValue: boolean;
}) {
  const [open, setOpen] = useState(hasValue);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-4 py-2.5 text-left">
        <span className="text-[10px] text-slate-400">{open ? "▾" : "▸"}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">{title}</span>
        {hasValue && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-500" />}
      </button>
      {open && <div className="px-4 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

/**
 * The Booking Filters rail.
 *
 * Kept as a standing left column rather than a panel you toggle: on the
 * bookings screen the filters *are* the navigation, and hiding them behind a
 * button means you cannot see what the list is currently narrowed to.
 */
export default function BookingFilters({
  value,
  onChange,
  onReset,
  onExportCsv,
  resultCount,
}: {
  value: BookingFilterState;
  onChange: (patch: Partial<BookingFilterState>) => void;
  onReset: () => void;
  onExportCsv: () => void;
  resultCount: number;
}) {
  const { data: tours } = useListAdminTours();
  const { data: categories } = useListAdminTourCategories();
  const { data: agents } = useListAgents({});
  const f = value;

  return (
    <aside className="w-60 shrink-0 rounded-2xl border border-slate-200 bg-white overflow-hidden self-start sticky top-8">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-base font-semibold text-slate-700">Booking filters</h2>
      </div>

      {/* Quick filters — the two questions the team asks every morning. */}
      <div className="px-4 py-3 border-b border-slate-100 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Quick filters</div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-3.5 w-3.5" checked={f.balanceDue} onChange={(e) => onChange({ balanceDue: e.target.checked })} />
          <span className="text-xs text-slate-600">
            <span className="font-semibold">Balance payment</span>
            <span className="block text-[11px] text-slate-400">Still owes money</span>
          </span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5"
            checked={f.status === "cart_abandoned"}
            onChange={(e) => onChange({ status: e.target.checked ? "cart_abandoned" : "open" })}
          />
          <span className="text-xs text-slate-600">
            <span className="font-semibold">Incomplete booking</span>
            <span className="block text-[11px] text-slate-400">Left before paying</span>
          </span>
        </label>
      </div>

      <Section title="Search for a booking" hasValue={!!f.q}>
        <input
          className={inputCls}
          placeholder="Ref, name, email, phone…"
          value={f.q}
          onChange={(e) => onChange({ q: e.target.value })}
        />
      </Section>

      <Section title="Booking status" hasValue={f.status !== "open"}>
        <select className={inputCls} value={f.status} onChange={(e) => onChange({ status: e.target.value })}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </Section>

      <Section title="Booking source" hasValue={!!f.source}>
        <select className={inputCls} value={f.source} onChange={(e) => onChange({ source: e.target.value })}>
          <option value="">Any source</option>
          {SOURCES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </Section>

      <Section title="Booking dates" hasValue={!!(f.bookedFrom || f.bookedTo)}>
        <div>
          <label className={labelCls}>From</label>
          <input type="date" className={inputCls} value={f.bookedFrom} onChange={(e) => onChange({ bookedFrom: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>To</label>
          <input type="date" className={inputCls} value={f.bookedTo} onChange={(e) => onChange({ bookedTo: e.target.value })} />
        </div>
      </Section>

      <Section title="Departure dates" hasValue={!!(f.departsFrom || f.departsTo)}>
        <div>
          <label className={labelCls}>From</label>
          <input type="date" className={inputCls} value={f.departsFrom} onChange={(e) => onChange({ departsFrom: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>To</label>
          <input type="date" className={inputCls} value={f.departsTo} onChange={(e) => onChange({ departsTo: e.target.value })} />
        </div>
      </Section>

      <Section title="Collections" hasValue={!!f.category}>
        <select className={inputCls} value={f.category} onChange={(e) => onChange({ category: e.target.value })}>
          <option value="">Any collection</option>
          {(categories ?? []).map((c: any) => (
            <option key={c.slug} value={c.slug}>{c.name ?? c.label ?? c.slug}</option>
          ))}
        </select>
      </Section>

      <Section title="Trips" hasValue={!!f.tourId}>
        <select className={inputCls} value={f.tourId} onChange={(e) => onChange({ tourId: e.target.value })}>
          <option value="">Any trip</option>
          {(tours ?? []).map((t: any) => (
            <option key={t.id} value={t.id}>{t.code ? `${t.code} — ${t.title}` : t.title}</option>
          ))}
        </select>
      </Section>

      <Section title="Payment type" hasValue={!!(f.paymentStatus || f.paymentMethod)}>
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={f.paymentStatus} onChange={(e) => onChange({ paymentStatus: e.target.value })}>
            <option value="">Any</option>
            {PAY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Method</label>
          <select className={inputCls} value={f.paymentMethod} onChange={(e) => onChange({ paymentMethod: e.target.value })}>
            <option value="">Any</option>
            {PAY_METHODS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </div>
      </Section>

      <Section title="Search by agent" hasValue={!!f.agentId}>
        <select className={inputCls} value={f.agentId} onChange={(e) => onChange({ agentId: e.target.value })}>
          <option value="">Any agent</option>
          <option value="none">Direct (no agent)</option>
          {(agents ?? []).map((a: any) => (
            <option key={a.id} value={a.id}>{a.company ? `${a.name} — ${a.company}` : a.name}</option>
          ))}
        </select>
      </Section>

      <div className="px-4 py-3 border-t border-slate-200 flex items-center gap-2">
        <button
          type="button"
          onClick={onExportCsv}
          className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Export CSV
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Reset
        </button>
      </div>
      <div className="px-4 pb-3 text-[11px] text-slate-400">
        {resultCount} booking{resultCount === 1 ? "" : "s"} shown
      </div>
    </aside>
  );
}
