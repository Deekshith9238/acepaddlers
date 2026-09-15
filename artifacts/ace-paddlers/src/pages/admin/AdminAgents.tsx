import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useListAgents,
  useCreateAgent,
  type AgentDetail,
} from "@workspace/api-client-react";
import { rupees, fmtDate } from "@/admin/booking/sections";

/* eslint-disable @typescript-eslint/no-explicit-any */

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1";

const ERRORS: Record<string, string> = {
  email_exists: "An agent with that email address already exists.",
  invalid_email: "That doesn't look like an email address.",
  name_required: "The agent needs a name.",
  invalid_commission: "Commission must be between 0 and 100.",
  invalid_status: "Pick a valid status.",
};

/** VL's tabs, in its wording: an invited agent is "awaiting". */
const TABS: { key: string; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "invited", label: "Awaiting" },
  { key: "inactive", label: "Inactive" },
  { key: "", label: "All" },
];

export function AgentAvatar({ name }: { name: string }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
      {initial}
    </span>
  );
}

export const AGENT_STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  active: { bg: "#d1fae5", fg: "#065f46", label: "Active" },
  invited: { bg: "#fef3c7", fg: "#92400e", label: "Awaiting" },
  inactive: { bg: "#e2e8f0", fg: "#475569", label: "Inactive" },
};

export function AgentStatusBadge({ status }: { status: string }) {
  const s = AGENT_STATUS_STYLES[status] ?? { bg: "#e2e8f0", fg: "#475569", label: status };
  return (
    <span className="rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function InviteForm({ onCreated }: { onCreated: () => void }) {
  const create = useCreateAgent();
  const blank = { name: "", company: "", email: "", phone: "", city: "", commissionPercent: "", notes: "" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    setError(null);
    create.mutate(
      {
        data: {
          name: form.name.trim(),
          company: form.company.trim() || null,
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          commissionPercent: form.commissionPercent ? Number(form.commissionPercent) : 0,
          notes: form.notes.trim() || null,
        } as any,
      },
      {
        onSuccess: () => { setForm(blank); onCreated(); },
        onError: (err: any) => setError(ERRORS[err?.data?.error] ?? "Couldn't add that agent."),
      },
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
      <h2 className="text-base font-semibold text-slate-800">Add an agent</h2>
      <p className="text-sm text-slate-500 mt-1 mb-4">
        They're added as <span className="font-medium">awaiting</span> until you mark them active. Agents have no login —
        they're who a booking is credited to.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><label className={labelCls}>Name</label><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ravi Kumar" /></div>
        <div><label className={labelCls}>Company</label><input className={inputCls} value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Coorg Travel Desk" /></div>
        <div><label className={labelCls}>Email</label><input className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ravi@agency.com" /></div>
        <div><label className={labelCls}>Phone</label><input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        <div><label className={labelCls}>City</label><input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Bangalore" /></div>
        <div>
          <label className={labelCls}>Commission %</label>
          <input type="number" min={0} max={100} className={inputCls} value={form.commissionPercent} onChange={(e) => set("commissionPercent", e.target.value)} placeholder="10" />
        </div>
      </div>
      <div className="mt-4">
        <label className={labelCls}>Notes</label>
        <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={submit} disabled={create.isPending} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
          {create.isPending ? "Adding…" : "Add agent"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

export default function AdminAgents() {
  const [status, setStatus] = useState("active");
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data, refetch, isLoading } = useListAgents({
    ...(status ? { status } : {}),
    ...(q ? { q } : {}),
  });
  const rows: AgentDetail[] = Array.isArray(data) ? data : [];

  // Counts come off an unfiltered read so the tabs don't change as you search.
  const { data: allData } = useListAgents({});
  const all: AgentDetail[] = Array.isArray(allData) ? allData : [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { active: 0, invited: 0, inactive: 0, "": all.length };
    for (const a of all) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, [all]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">My agents</h1>
          <p className="text-sm text-slate-500 mt-1">
            Travel agents and resellers who send you business, and what each has brought in.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
          {showForm ? "Cancel" : "Add agent"}
        </button>
      </div>

      {showForm && <InviteForm onCreated={() => { setShowForm(false); refetch(); }} />}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {TABS.map((t) => {
          const active = status === t.key;
          const n = counts[t.key] ?? 0;
          return (
            <button
              key={t.key || "all"}
              type="button"
              onClick={() => setStatus(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active ? "bg-cyan-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}>
              {t.label}
              <span className={active ? "ml-1.5 opacity-80" : "ml-1.5 text-slate-400"}>{n}</span>
            </button>
          );
        })}
        <span className="flex-1" />
        <input
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Search name, company, email, phone, city…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-400">
            {q ? "No agents match that search." : "No agents here yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-left">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Bookings</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3">Last booking</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-cyan-50/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/agents/${a.id}`} className="flex items-center gap-3 no-underline">
                      <AgentAvatar name={a.name} />
                      <span>
                        <span className="block text-sm font-medium text-slate-800">{a.name}</span>
                        {a.company && <span className="block text-xs text-slate-500">{a.company}</span>}
                        <span className="block text-xs text-slate-400">{a.email}</span>
                        {a.phone && <span className="block text-xs text-slate-400">{a.phone}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top"><AgentStatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 align-top text-right text-sm text-slate-700 tabular-nums">{a.totalBookings}</td>
                  <td className="px-4 py-3 align-top text-right text-sm text-slate-700 tabular-nums">{rupees(a.totalValue)}</td>
                  <td className="px-4 py-3 align-top text-right text-sm tabular-nums">
                    {a.commissionPercent > 0 ? (
                      <>
                        <span className="text-slate-700">{rupees(a.commissionValue)}</span>
                        <span className="block text-xs text-slate-400">at {a.commissionPercent}%</span>
                      </>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-slate-500">{fmtDate(a.lastBookingDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
