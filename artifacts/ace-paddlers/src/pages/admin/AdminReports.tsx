import { Fragment, useMemo, useState } from "react";
import { useSearch } from "wouter";
import {
  useListReportTypes,
  useRunReport,
  useListScheduledReports,
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  useRunScheduledReportNow,
  useListAdminTours,
  type ReportMeta,
  type ScheduledReport,
} from "@workspace/api-client-react";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

const SCHEDULE_ERRORS: Record<string, string> = {
  unknown_report: "That report type no longer exists.",
  invalid_cadence: "Pick daily, weekly or monthly.",
  invalid_send_hour: "Send hour must be between 0 and 23.",
  recipients_required: "Add at least one recipient.",
  invalid_recipient: "One of those email addresses looks wrong.",
  name_required: "Give the schedule a name.",
};

function rupees(n: number): string {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function isoDaysAgo(n: number): string {
  const d = new Date(Date.now() + 5.5 * 3600e3);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const PRESETS: { label: string; from: () => string; to: () => string }[] = [
  { label: "Last 7 days", from: () => isoDaysAgo(6), to: () => isoDaysAgo(0) },
  { label: "Last 30 days", from: () => isoDaysAgo(29), to: () => isoDaysAgo(0) },
  { label: "Last 90 days", from: () => isoDaysAgo(89), to: () => isoDaysAgo(0) },
  { label: "This year", from: () => `${new Date().getFullYear()}-01-01`, to: () => isoDaysAgo(0) },
  // Manifests look forward, not back — the next fortnight of departures.
  { label: "Next 14 days", from: () => isoDaysAgo(0), to: () => isoDaysAgo(-14) },
];

function ScheduleRow({ s, reports, onChanged }: { s: ScheduledReport; reports: ReportMeta[]; onChanged: () => void }) {
  const update = useUpdateScheduledReport();
  const remove = useDeleteScheduledReport();
  const runNow = useRunScheduledReportNow();
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(false);
  const label = reports.find((r) => r.key === s.reportKey)?.label ?? s.reportKey;

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-slate-800">{s.name}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {s.cadence} at {String(s.sendHour).padStart(2, "0")}:00 IST
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{s.recipients.join(", ")}</td>
      <td className="px-4 py-3 text-xs">
        {s.lastError ? (
          <span className="text-red-600">{s.lastError}</span>
        ) : s.lastSentOn ? (
          <span className="text-slate-500">last sent {s.lastSentOn}</span>
        ) : (
          <span className="text-slate-400">not sent yet</span>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => update.mutate({ id: s.id, data: { active: !s.active } }, { onSuccess: onChanged })}
          className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
            s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}>
          {s.active ? "On" : "Off"}
        </button>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={() => runNow.mutate({ id: s.id }, { onSuccess: () => { setSent(true); setTimeout(() => setSent(false), 2500); } })}
          className="text-xs font-semibold text-cyan-600 hover:underline">
          {sent ? "Sent" : "Send now"}
        </button>
        {confirm ? (
          <>
            <button type="button" onClick={() => remove.mutate({ id: s.id }, { onSuccess: onChanged })} className="ml-3 text-xs font-semibold text-red-600 hover:underline">Confirm</button>
            <button type="button" onClick={() => setConfirm(false)} className="ml-2 text-xs text-slate-400 hover:underline">No</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="ml-3 text-xs text-red-600 hover:underline">Delete</button>
        )}
      </td>
    </tr>
  );
}

function Schedules({ reports }: { reports: ReportMeta[] }) {
  const { data, refetch } = useListScheduledReports();
  const create = useCreateScheduledReport();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", reportKey: reports[0]?.key ?? "", cadence: "daily", sendHour: "7", recipients: "" });
  const rows: ScheduledReport[] = Array.isArray(data) ? data : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate(
      {
        data: {
          name: form.name.trim(),
          reportKey: form.reportKey,
          cadence: form.cadence as "daily" | "weekly" | "monthly",
          sendHour: Number(form.sendHour) || 7,
          recipients: form.recipients.split(",").map((r) => r.trim()).filter(Boolean),
          active: true,
        },
      },
      {
        onSuccess: () => { setOpen(false); setForm({ ...form, name: "", recipients: "" }); refetch(); },
        onError: (err: unknown) => {
          const code = (err as { data?: { error?: string } })?.data?.error;
          setError((code && SCHEDULE_ERRORS[code]) ?? "Couldn't save that schedule.");
        },
      },
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-8">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Scheduled reports</h2>
          <p className="text-sm text-slate-500 mt-0.5">Emailed as a CSV on a cadence. Each run covers the last complete period.</p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          {open ? "Cancel" : "New schedule"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div><label className={labelCls}>Name</label><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Daily passenger list" /></div>
          <div>
            <label className={labelCls}>Report</label>
            <select className={inputCls} value={form.reportKey} onChange={(e) => setForm({ ...form, reportKey: e.target.value })}>
              {reports.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Cadence</label>
            <select className={inputCls} value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value })}>
              <option value="daily">Daily</option><option value="weekly">Weekly (Mondays)</option><option value="monthly">Monthly (1st)</option>
            </select>
          </div>
          <div><label className={labelCls}>Send hour (IST)</label><input className={inputCls} type="number" min={0} max={23} value={form.sendHour} onChange={(e) => setForm({ ...form, sendHour: e.target.value })} /></div>
          <div><label className={labelCls}>Recipients</label><input className={inputCls} value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} placeholder="a@x.com, b@x.com" /></div>
          {error && <p className="sm:col-span-2 lg:col-span-5 text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" disabled={create.isPending} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
              {create.isPending ? "Saving…" : "Create schedule"}
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">No scheduled reports yet.</p>
      ) : (
        <table className="w-full">
          <thead className="bg-slate-50 text-left">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Schedule</th><th className="px-4 py-3">When</th>
              <th className="px-4 py-3">To</th><th className="px-4 py-3">Last run</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>{rows.map((s) => <ScheduleRow key={s.id} s={s} reports={reports} onChanged={refetch} />)}</tbody>
        </table>
      )}
    </div>
  );
}

function Inner() {
  const { data: reportTypes } = useListReportTypes();
  const { data: tours } = useListAdminTours();
  const reports: ReportMeta[] = useMemo(() => (Array.isArray(reportTypes) ? reportTypes : []), [reportTypes]);
  // The report type lives in the URL so the sidebar's report list (Reports →
  // Product sales, Coupons, …) can select one, and so a run is linkable.
  const search = useSearch();
  // No ?key= means the sidebar's "Scheduled reports" entry: show the schedule
  // manager on its own, exactly as Vacation Labs does.
  const selected = new URLSearchParams(search).get("key");
  const key = selected || "product_sales";
  const [filters, setFilters] = useState({ from: isoDaysAgo(29), to: isoDaysAgo(0), tourId: "", status: "", couponCode: "" });

  const params = useMemo(() => {
    const p: Record<string, string> = { key };
    for (const [k, v] of Object.entries(filters)) if (v) p[k] = v;
    return p;
  }, [key, filters]);

  const { data, isLoading } = useRunReport(params as never);
  const meta = reports.find((r) => r.key === key);
  const set = (k: keyof typeof filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));

  const exportCsv = () => {
    const qs = new URLSearchParams(params);
    const token = localStorage.getItem("admin_token");
    fetch(`/api/admin/reports/export.csv?${qs}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${key}-${filters.from}_${filters.to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const columns = data?.columns ?? [];
  const rows = (data?.rows ?? []) as Record<string, unknown>[];
  const totals = (data?.totals ?? {}) as Record<string, number>;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 mb-1">Reports</h1>
      <p className="text-sm text-slate-500 mb-6">Run any report on a date range, export it, or have it emailed on a schedule.</p>

      {!selected ? (
        <Schedules reports={reports} />
      ) : (
        <>
      {meta && (
        <p className="text-sm text-slate-500 mb-4">
          {meta.description} <span className="text-slate-400">· filtered on {meta.dateBasis.toLowerCase()}</span>
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p) => (
            <button key={p.label} type="button"
              onClick={() => setFilters((f) => ({ ...f, from: p.from(), to: p.to() }))}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div><label className={labelCls}>From</label><input type="date" className={inputCls} value={filters.from} onChange={(e) => set("from", e.target.value)} /></div>
          <div><label className={labelCls}>To</label><input type="date" className={inputCls} value={filters.to} onChange={(e) => set("to", e.target.value)} /></div>
          <div>
            <label className={labelCls}>Tour</label>
            <select className={inputCls} value={filters.tourId} onChange={(e) => set("tourId", e.target.value)}>
              <option value="">All tours</option>
              {(tours ?? []).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Status</label><input className={inputCls} value={filters.status} onChange={(e) => set("status", e.target.value)} placeholder="Any" /></div>
          <div className="flex items-end pb-0.5">
            <button type="button" onClick={exportCsv} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Running…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-400">No data for this period.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 ${c.numeric ? "text-right" : ""}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-2.5 text-sm text-slate-700 ${c.numeric ? "text-right tabular-nums" : ""}`}>
                      {c.money ? rupees(Number(row[c.key])) : String(row[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                {columns.map((c, i) => (
                  <td key={c.key} className={`px-4 py-3 text-sm text-slate-800 ${c.numeric ? "text-right tabular-nums" : ""}`}>
                    {i === 0 ? "Total" : c.numeric ? (c.money ? rupees(totals[c.key] ?? 0) : (totals[c.key] ?? 0)) : ""}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
        </>
      )}
    </>
  );
}

export default function AdminReports() {
  return (
    <Inner />
  );
}
