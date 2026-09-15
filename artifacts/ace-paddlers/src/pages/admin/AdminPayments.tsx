import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useGetRazorpayIntegration, useGetWhatsAppIntegration, useListPayments, type PaymentDetail } from "@workspace/api-client-react";

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
  const { data, isLoading } = useListPayments();
  const rows: PaymentDetail[] = Array.isArray(data) ? data : [];

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Payments log</h2>
      <p className="text-sm text-slate-500 mb-5">
        Every payment attempt across every booking — a booking can have more than one row here (e.g. an expired link
        followed by a fresh one). The booking's own paid/unpaid status is the source of truth; this is the provider-side trail.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">No payments yet.</p>
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
                      <Link href={`/admin/bookings`} className="text-cyan-700 hover:underline">{p.bookingRef}</Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.customerName ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3">{p.tourTitle ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{p.provider}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{p.currency} {p.amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold uppercase" style={{ color: STATUS_COLORS[p.status] ?? "#64748b" }}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{new Date(p.createdAt).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
