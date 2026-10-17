import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useGetRazorpayIntegration, useGetWhatsAppIntegration, type PaymentDetail } from "@workspace/api-client-react";
import { usePagedList, useDebounced } from "@/admin/usePagedList";
import Pager from "@/admin/Pager";

const PROVIDERS: { value: string; label: string }[] = [
  { value: "razorpay", label: "Payment link" },
  { value: "razorpay_order", label: "Website checkout" },
  { value: "manual", label: "Recorded by hand" },
  { value: "legacy", label: "Marked paid (old system)" },
];
const ctl = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

const STATUS_COLORS: Record<string, string> = {
  created: "#94a3b8",
  paid: "#047857",
  expired: "#b45309",
  cancelled: "#b91c1c",
  failed: "#b91c1c",
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="text-xs font-bold uppercase px-2.5 py-1 rounded-full"
      style={ok ? { background: "#ecfdf5", color: "#047857" } : { background: "#fef2f2", color: "#b91c1c" }}>
      {label}
    </span>
  );
}

function ProvidersCard() {
  const razorpay = useGetRazorpayIntegration();
  const whatsapp = useGetWhatsAppIntegration();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-xl">
      <h2 className="text-lg font-semibold text-slate-800">Payment providers</h2>
      <p className="text-sm text-slate-500 mt-1 mb-4">
        Live keys are set on the server, not here — this just shows whether they're configured.
      </p>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-700">Razorpay</div>
            {razorpay.data?.keyId && <div className="text-xs text-slate-400 font-mono">{razorpay.data.keyId}</div>}
          </div>
          {razorpay.data ? (
            <StatusPill ok={razorpay.data.configured} label={razorpay.data.configured ? "Configured" : "Not configured"} />
          ) : (
            <span className="text-xs text-slate-400">Loading…</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700">WhatsApp notifications</div>
          {whatsapp.data ? (
            <StatusPill ok={whatsapp.data.configured} label={whatsapp.data.configured ? "Configured" : "Not configured"} />
          ) : (
            <span className="text-xs text-slate-400">Loading…</span>
          )}
        </div>
      </div>
    </div>
  );
}

let chargeSeq = 0;
const newChargeId = () => `new-${Date.now()}-${chargeSeq++}`;

function PaymentsLog() {
  const [f, setF] = useState({ q: "", status: "", provider: "", kind: "", from: "", to: "" });
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const q = useDebounced(f.q);
  const list = usePagedList<PaymentDetail & { kind?: string }>("/payments", { ...f, q });
  const rows = list.items;
  const isLoading = !list.loaded;
  const filtered = Boolean(f.q || f.status || f.provider || f.kind || f.from || f.to);

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Payments log</h2>
      <p className="text-sm text-slate-500 mb-5">
        Every payment attempt across every booking — a booking can have more than one row here (e.g. an expired link
        followed by a fresh one). The booking's own paid/unpaid status is the source of truth; this is the provider-side trail.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className={`${ctl} w-64`} placeholder="Search booking ref, customer, payment id…" value={f.q} onChange={(e) => set({ q: e.target.value })} />
        <select className={ctl} value={f.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">Any status</option>
          {Object.keys(STATUS_COLORS).map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className={ctl} value={f.provider} onChange={(e) => set({ provider: e.target.value })}>
          <option value="">Any way</option>
          {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select className={ctl} value={f.kind} onChange={(e) => set({ kind: e.target.value })}>
          <option value="">Payments & refunds</option>
          <option value="payment">Payments only</option>
          <option value="refund">Refunds only</option>
        </select>
        <label className="flex items-center gap-1 text-xs text-slate-500">From <input type="date" className={ctl} value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
        <label className="flex items-center gap-1 text-xs text-slate-500">To <input type="date" className={ctl} value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
        {filtered && <button type="button" className="text-xs font-semibold text-slate-500 hover:underline" onClick={() => setF({ q: "", status: "", provider: "", kind: "", from: "", to: "" })}>Clear</button>}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">{filtered ? "No payments match these filters." : "No payments yet."}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["Booking", "Customer", "Tour", "Provider", "Amount", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">
                    {p.bookingRef ? (
                      <Link href={`/admin/bookings/${p.bookingId}`} className="text-cyan-700 hover:underline">{p.bookingRef}</Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.customerName ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3">{p.tourTitle ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                    {PROVIDERS.find((x) => x.value === p.provider)?.label ?? p.provider}
                    {p.kind === "refund" && <span className="ml-1 font-semibold text-red-700">refund</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{p.currency} {p.amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold uppercase" style={{ color: STATUS_COLORS[p.status] ?? "#64748b" }}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{new Date(p.createdAt).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 px-4">
            <Pager page={list.page} pageSize={list.pageSize} total={list.total} loading={list.loading}
              onPage={list.setPage} onPageSize={list.setPageSize} noun="payments" />
          </div>
        </div>
      )}
    </div>
  );
}

function Inner() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Payments</h1>
      <ProvidersCard />
      <PaymentsLog />
    </>
  );
}

export default function AdminPayments() {
  return (
    <Inner />
  );
}
