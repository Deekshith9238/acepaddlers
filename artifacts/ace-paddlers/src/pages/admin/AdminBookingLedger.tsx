import { useState } from "react";
import {
  useGetBookingLedger,
  useRecordBookingPayment,
  useDeleteBookingPayment,
  useSyncBookingWithRazorpay,
  type RazorpaySyncRow,
  type LedgerEntry,
  type ManualPaymentInputMethod,
} from "@workspace/api-client-react";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";

const METHODS: { value: ManualPaymentInputMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer / NEFT" },
  { value: "upi", label: "UPI (direct)" },
  { value: "cheque", label: "Cheque" },
  { value: "card_machine", label: "Card machine" },
  { value: "other", label: "Other" },
];

function rupees(n: number, currency = "INR"): string {
  return currency === "INR" ? `₹${n.toLocaleString("en-IN")}` : `${currency} ${n.toLocaleString("en-IN")}`;
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function EntryRow({ e, bookingId, onChanged }: { e: LedgerEntry; bookingId: string; onChanged: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = useDeleteBookingPayment();
  const isRefund = e.kind === "refund";
  const settled = e.status === "paid";

  return (
    <tr className="border-t border-slate-100">
      <td className="py-2 pr-3">
        <span
          className="text-xs font-bold uppercase"
          style={{ color: isRefund ? "#b91c1c" : settled ? "#047857" : "#94a3b8" }}>
          {isRefund ? "−" : "+"}
          {rupees(e.amount, e.currency)}
        </span>
        <div className="text-xs text-slate-400">{e.status}</div>
      </td>
      <td className="py-2 pr-3 text-sm text-slate-600">
        {e.provider === "legacy" ? "Marked paid by hand" : e.methodLabel}
        {e.reference && <div className="text-xs text-slate-400 font-mono">{e.reference}</div>}
      </td>
      <td className="py-2 pr-3 text-xs text-slate-500">
        {fmt(e.receivedAt ?? e.createdAt)}
        {e.recordedBy && <div className="text-slate-400">by {e.recordedBy}</div>}
      </td>
      <td className="py-2 pr-3 text-xs text-slate-500">
        {e.notes}
        {e.shortUrl && (
          <a href={e.shortUrl} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline block">
            payment link
          </a>
        )}
        {e.providerPaymentId && <span className="font-mono text-slate-400 block">{e.providerPaymentId}</span>}
      </td>
      <td className="py-2 text-right">
        {e.provider === "manual" || e.provider === "legacy" ? (
          confirm ? (
            <span className="whitespace-nowrap">
              <button
                type="button"
                onClick={() =>
                  remove.mutate(
                    { id: bookingId, paymentId: e.id },
                    {
                      onSuccess: () => { setConfirm(false); onChanged(); },
                      onError: (err: unknown) => {
                        const code = (err as { data?: { error?: string } })?.data?.error;
                        setError(
                          code === "would_go_negative"
                            ? "Remove the refunds recorded against this payment first."
                            : "Couldn't remove that entry.",
                        );
                        setConfirm(false);
                      },
                    },
                  )
                }
                className="text-xs font-semibold text-red-600 hover:underline">
                Confirm
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="ml-2 text-xs text-slate-400 hover:underline">
                No
              </button>
            </span>
          ) : (
            <>
              <button type="button" onClick={() => setConfirm(true)} className="text-xs text-red-600 hover:underline">
                Remove
              </button>
              {error && <div className="text-xs text-red-600 mt-1 max-w-[14rem]">{error}</div>}
            </>
          )
        ) : (
          <span className="text-xs text-slate-300" title="Gateway records can't be edited here">
            gateway
          </span>
        )}
      </td>
    </tr>
  );
}

/** Payments ledger for one booking: running balance, every entry, and the
 *  form for recording money that moved outside the gateway. */
export default function AdminBookingLedger({ bookingId, onChanged }: { bookingId: string; onChanged: () => void }) {
  const { data, refetch } = useGetBookingLedger(bookingId);
  const record = useRecordBookingPayment();
  const [kind, setKind] = useState<"payment" | "refund">("payment");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<ManualPaymentInputMethod>("cash");
  const [reference, setReference] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sync = useSyncBookingWithRazorpay();
  const [syncRows, setSyncRows] = useState<RazorpaySyncRow[] | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = () => {
    refetch();
    onChanged();
  };

  if (!data) return <p className="text-sm text-slate-400">Loading ledger…</p>;

  const hasGateway = data.entries.some((e) => e.provider === "razorpay" || e.provider === "razorpay_order");

  const runSync = () => {
    setSyncError(null);
    sync.mutate(
      { id: bookingId },
      {
        onSuccess: (res) => {
          setSyncRows(res.results);
          refresh();
        },
        onError: (err: unknown) => {
          const code = (err as { data?: { error?: string } })?.data?.error;
          setSyncError(
            code === "razorpay_not_configured"
              ? "Razorpay isn't set up on this server, so it can't be checked from here."
              : "Couldn't reach Razorpay. Try again in a moment.",
          );
        },
      },
    );
  };

  const recordAmount = (n: number, entryKind: "payment" | "refund") => {
    setError(null);
    if (!Number.isFinite(n) || n <= 0) return setError("Enter an amount greater than zero.");
    record.mutate(
      {
        id: bookingId,
        data: {
          kind: entryKind,
          amount: Math.round(n),
          method,
          reference: reference.trim() || null,
          receivedAt: receivedAt || null,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setAmount("");
          setReference("");
          setNotes("");
          setReceivedAt("");
          refresh();
        },
        onError: (err: unknown) => {
          const d = (err as { data?: { error?: string; maxRefund?: number } })?.data;
          setError(
            d?.error === "refund_exceeds_paid"
              ? `You can refund at most ${rupees(d.maxRefund ?? 0, data.currency)} — that's all this booking has paid.`
              : "Couldn't record that. Please try again.",
          );
        },
      },
    );
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    recordAmount(Number(amount), kind);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-5 mb-4">
        {[
          { label: "Total", value: data.total, color: "#0e2c34" },
          { label: "Paid", value: data.paid, color: "#047857" },
          ...(data.refunded > 0 ? [{ label: "Refunded", value: data.refunded, color: "#b91c1c" }] : []),
          { label: "Balance due", value: data.due, color: data.due > 0 ? "#b45309" : "#047857" },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</div>
            <div className="text-lg font-semibold" style={{ color: s.color }}>
              {rupees(s.value, data.currency)}
            </div>
          </div>
        ))}
      </div>

      {hasGateway && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600 m-0">
              Online payments update on their own when Razorpay tells us. If this looks wrong, ask Razorpay directly.
            </p>
            <button
              type="button"
              onClick={runSync}
              disabled={sync.isPending}
              className="rounded-lg border border-cyan-600 bg-white px-3 py-1.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 disabled:opacity-50">
              {sync.isPending ? "Checking with Razorpay…" : "Check with Razorpay"}
            </button>
          </div>
          {syncError && <p className="mt-2 mb-0 text-sm text-red-600">{syncError}</p>}
          {syncRows && (
            <ul className="mt-3 mb-0 space-y-1.5 text-sm list-none p-0">
              {syncRows.length === 0 && <li className="text-slate-500">No Razorpay orders or links on this booking.</li>}
              {syncRows.map((r) => {
                const tone =
                  r.outcome === "marked_paid" ? "text-emerald-700"
                  : r.outcome === "error" ? "text-red-600"
                  : r.outcome === "already_paid" && r.message.includes("Check this one") ? "text-amber-700"
                  : "text-slate-600";
                const mark = r.outcome === "marked_paid" ? "✓" : r.outcome === "error" ? "!" : "•";
                return (
                  <li key={r.paymentId} className={`flex gap-2 ${tone}`}>
                    <span aria-hidden="true" className="font-bold w-3 shrink-0">{mark}</span>
                    <span>
                      <code className="text-xs text-slate-500">{r.providerLinkId}</code> — {r.message}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {data.entries.length > 0 ? (
        <table className="w-full mb-4">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400 text-left">
              <th className="pb-1 pr-3">Amount</th>
              <th className="pb-1 pr-3">Method</th>
              <th className="pb-1 pr-3">Received</th>
              <th className="pb-1 pr-3">Details</th>
              <th className="pb-1" />
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e) => (
              <EntryRow key={e.id} e={e} bookingId={bookingId} onChanged={refresh} />
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-slate-400 mb-4">No payments recorded yet.</p>
      )}

      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          {(["payment", "refund"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                kind === k ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {k === "payment" ? "Record payment" : "Record refund"}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            className={inputCls}
            type="number"
            min={1}
            placeholder={kind === "payment" ? `Amount (due ${data.due})` : "Refund amount"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as ManualPaymentInputMethod)}>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <input className={inputCls} placeholder="Reference / cheque no." value={reference} onChange={(e) => setReference(e.target.value)} />
          <input className={inputCls} type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
          <input className={inputCls} placeholder="Note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={record.isPending}
          className="mt-3 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
          {record.isPending ? "Saving…" : kind === "payment" ? "Add payment" : "Add refund"}
        </button>
        {kind === "payment" && data.due > 0 && (
          <>
            <button
              type="button"
              disabled={record.isPending}
              onClick={() => recordAmount(data.due, "payment")}
              className="mt-3 ml-2 rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
              Paid in full — {rupees(data.due, data.currency)} by {METHODS.find((m) => m.value === method)?.label.toLowerCase() ?? "hand"}
            </button>
            <p className="mt-2 text-xs text-slate-400">
              For bookings paid outside Razorpay. Recording {rupees(data.due, data.currency)} settles this booking in full and confirms it automatically.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
